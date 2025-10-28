"""
Biogas Analytics Platform - Backend API
Flask application with analytics and ML inference capabilities
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from shared.data_layer.models import (
    db, SensorReading, HourlyAggregate, Anomaly, MaintenanceEvent, ModelPrediction
)
from shared.data_layer.config import AppConfig


def create_app():
    """Create and configure Flask app"""
    app = Flask(__name__)
    app.config.from_object(AppConfig)
    
    # Ensure directories exist
    AppConfig.ensure_directories()
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=AppConfig.CORS_ORIGINS)
    
    # Initialize database tables
    with app.app_context():
        try:
            db.create_all()
            print("✓ Database tables created/verified successfully")
            
            # Check if data exists
            reading_count = db.session.query(SensorReading).count()
            print(f"✓ Database contains {reading_count:,} sensor readings")
            
        except Exception as e:
            print(f"⚠️  Database initialization warning: {e}")
    
    return app


app = create_app()


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def get_time_range_params():
    """Helper to get time range from request params"""
    hours = request.args.get('hours', 24, type=int)
    
    # Validate hours
    if hours < 1 or hours > 8760:  # Max 1 year
        hours = 24
    
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=hours)
    
    return start_time, end_time


def format_response(data, message=None):
    """Format API response"""
    response = {'data': data}
    if message:
        response['message'] = message
    return jsonify(response)


def format_error(message, status_code=400):
    """Format error response"""
    return jsonify({'error': message}), status_code


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        reading_count = db.session.query(SensorReading).count()
        aggregate_count = db.session.query(HourlyAggregate).count()
        
        # Get date range
        date_range = db.session.query(
            func.min(SensorReading.timestamp),
            func.max(SensorReading.timestamp)
        ).first()
        
        return jsonify({
            'status': 'healthy',
            'database': {
                'connected': True,
                'sensor_readings': reading_count,
                'hourly_aggregates': aggregate_count,
                'date_range': {
                    'start': date_range[0].isoformat() if date_range[0] else None,
                    'end': date_range[1].isoformat() if date_range[1] else None
                }
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


# ============================================================
# SYSTEM OVERVIEW ENDPOINTS
# ============================================================

@app.route('/api/system/summary', methods=['GET'])
def system_summary():
    """Get system overview summary metrics"""
    try:
        start_time, end_time = get_time_range_params()
        
        # Query aggregated metrics
        metrics = db.session.query(
            func.avg(SensorReading.ch4_percent).label('avg_ch4'),
            func.avg(SensorReading.co2_percent).label('avg_co2'),
            func.avg(SensorReading.gas_flow).label('avg_flow'),
            func.sum(SensorReading.daily_energy).label('total_energy'),
            func.avg(SensorReading.system_health_score).label('avg_health'),
            func.avg(SensorReading.comp_motor_amps).label('avg_comp_amps'),
            func.count(SensorReading.id).label('reading_count')
        ).filter(
            SensorReading.timestamp.between(start_time, end_time)
        ).first()
        
        # Calculate uptime
        uptime_data = db.session.query(
            func.sum(func.cast(SensorReading.comp_running, db.Integer)).label('running_count'),
            func.count(SensorReading.id).label('total_count')
        ).filter(
            SensorReading.timestamp.between(start_time, end_time)
        ).first()
        
        uptime_pct = (uptime_data.running_count / uptime_data.total_count * 100) if uptime_data.total_count > 0 else 0
        
        # Get fault count
        fault_count = db.session.query(
            func.count(SensorReading.id)
        ).filter(
            SensorReading.timestamp.between(start_time, end_time),
            or_(SensorReading.comp_fault == True, SensorReading.blower_fault == True)
        ).scalar()
        
        return format_response({
            'gas_production': {
                'avg_ch4_percent': round(metrics.avg_ch4 or 0, 2),
                'avg_co2_percent': round(metrics.avg_co2 or 0, 2),
                'avg_flow_rate': round(metrics.avg_flow or 0, 2),
                'total_energy': round(metrics.total_energy or 0, 2)
            },
            'system_health': {
                'health_score': round(metrics.avg_health or 0, 1),
                'uptime_percentage': round(uptime_pct, 2),
                'fault_count': fault_count or 0
            },
            'equipment': {
                'avg_compressor_amps': round(metrics.avg_comp_amps or 0, 2)
            },
            'data_points': metrics.reading_count or 0,
            'time_range': {
                'start': start_time.isoformat(),
                'end': end_time.isoformat(),
                'hours': (end_time - start_time).total_seconds() / 3600
            }
        })
        
    except Exception as e:
        app.logger.error(f"Error in system_summary: {str(e)}", exc_info=True)
        return format_error(f"Failed to load system summary: {str(e)}", 500)


@app.route('/api/system/trends', methods=['GET'])
def system_trends():
    """Get system trends over time (hourly aggregates)"""
    try:
        start_time, end_time = get_time_range_params()
        
        # Use hourly aggregates for better performance
        trends = db.session.query(HourlyAggregate).filter(
            HourlyAggregate.timestamp.between(start_time, end_time)
        ).order_by(HourlyAggregate.timestamp).all()
        
        result = [{
            'timestamp': t.timestamp.isoformat(),
            'ch4_percent': round(t.avg_ch4 or 0, 2),
            'co2_percent': round(t.avg_co2 or 0, 2),
            'flow_rate': round(t.avg_flow or 0, 2),
            'energy': round(t.total_energy or 0, 2),
            'health_score': round(t.avg_health_score or 0, 1),
            'uptime_pct': round(t.uptime_percentage or 0, 2),
            'comp_amps': round(t.avg_comp_amps or 0, 2)
        } for t in trends]
        
        return format_response(result)
        
    except Exception as e:
        app.logger.error(f"Error in system_trends: {str(e)}", exc_info=True)
        return format_error(f"Failed to load trends: {str(e)}", 500)


# ============================================================
# GAS COMPOSITION ENDPOINTS
# ============================================================

@app.route('/api/gas/composition', methods=['GET'])
def gas_composition():
    """Get gas composition metrics"""
    try:
        start_time, end_time = get_time_range_params()
        
        # Get composition stats
        stats = db.session.query(
            func.avg(SensorReading.ch4_percent).label('avg_ch4'),
            func.min(SensorReading.ch4_percent).label('min_ch4'),
            func.max(SensorReading.ch4_percent).label('max_ch4'),
            func.avg(SensorReading.co2_percent).label('avg_co2'),
            func.avg(SensorReading.n2_percent).label('avg_n2'),
            func.avg(SensorReading.o2_percent).label('avg_o2'),
            func.avg(SensorReading.h2s_ppm).label('avg_h2s'),
            func.avg(SensorReading.gas_quality_score).label('avg_quality')
        ).filter(
            SensorReading.timestamp.between(start_time, end_time)
        ).first()
        
        return format_response({
            'methane': {
                'average': round(stats.avg_ch4 or 0, 2),
                'min': round(stats.min_ch4 or 0, 2),
                'max': round(stats.max_ch4 or 0, 2),
                'target': 73.0,
                'unit': '%'
            },
            'carbon_dioxide': {
                'average': round(stats.avg_co2 or 0, 2),
                'unit': '%'
            },
            'nitrogen': {
                'average': round(stats.avg_n2 or 0, 2),
                'unit': '%'
            },
            'oxygen': {
                'average': round(stats.avg_o2 or 0, 2),
                'unit': '%'
            },
            'hydrogen_sulfide': {
                'average': round(stats.avg_h2s or 0, 2),
                'unit': 'ppm'
            },
            'quality_score': round(stats.avg_quality or 0, 1)
        })
        
    except Exception as e:
        app.logger.error(f"Error in gas_composition: {str(e)}", exc_info=True)
        return format_error(f"Failed to load gas composition: {str(e)}", 500)


@app.route('/api/gas/trends', methods=['GET'])
def gas_trends():
    """Get gas composition trends over time"""
    try:
        start_time, end_time = get_time_range_params()
        
        # Use hourly aggregates
        trends = db.session.query(HourlyAggregate).filter(
            HourlyAggregate.timestamp.between(start_time, end_time)
        ).order_by(HourlyAggregate.timestamp).all()
        
        result = [{
            'timestamp': t.timestamp.isoformat(),
            'ch4': round(t.avg_ch4 or 0, 2),
            'co2': round(t.avg_co2 or 0, 2)
        } for t in trends]
        
        return format_response(result)
        
    except Exception as e:
        app.logger.error(f"Error in gas_trends: {str(e)}", exc_info=True)
        return format_error(f"Failed to load gas trends: {str(e)}", 500)


# ============================================================
# EQUIPMENT MONITORING ENDPOINTS
# ============================================================

@app.route('/api/equipment/compressor', methods=['GET'])
def compressor_metrics():
    """Get compressor performance metrics"""
    try:
        start_time, end_time = get_time_range_params()
        
        # Get compressor stats
        stats = db.session.query(
            func.avg(SensorReading.comp_motor_amps).label('avg_amps'),
            func.max(SensorReading.comp_motor_amps).label('max_amps'),
            func.avg(SensorReading.comp_discharge_pressure).label('avg_discharge_pressure'),
            func.avg(SensorReading.comp_discharge_temp).label('avg_discharge_temp'),
            func.max(SensorReading.comp_discharge_temp).label('max_discharge_temp'),
            func.avg(SensorReading.comp_oil_temp).label('avg_oil_temp'),
            func.avg(SensorReading.comp_filter_diff_pressure).label('avg_filter_diff'),
            func.avg(SensorReading.compressor_efficiency).label('avg_efficiency')
        ).filter(
            SensorReading.timestamp.between(start_time, end_time)
        ).first()
        
        # Get running status
        uptime_data = db.session.query(
            func.sum(func.cast(SensorReading.comp_running, db.Integer)).label('running_count'),
            func.count(SensorReading.id).label('total_count')
        ).filter(
            SensorReading.timestamp.between(start_time, end_time)
        ).first()
        
        uptime_pct = (uptime_data.running_count / uptime_data.total_count * 100) if uptime_data.total_count > 0 else 0
        
        return format_response({
            'motor': {
                'avg_current_amps': round(stats.avg_amps or 0, 2),
                'max_current_amps': round(stats.max_amps or 0, 2),
                'status': 'running' if uptime_pct > 50 else 'stopped'
            },
            'pressure': {
                'avg_discharge_psi': round(stats.avg_discharge_pressure or 0, 2)
            },
            'temperature': {
                'avg_discharge_f': round(stats.avg_discharge_temp or 0, 2),
                'max_discharge_f': round(stats.max_discharge_temp or 0, 2),
                'avg_oil_temp_f': round(stats.avg_oil_temp or 0, 2)
            },
            'maintenance': {
                'filter_diff_pressure_psi': round(stats.avg_filter_diff or 0, 2),
                'filter_status': 'good' if (stats.avg_filter_diff or 0) < 10 else 'needs_attention'
            },
            'efficiency': round(stats.avg_efficiency or 0, 2),
            'uptime_percentage': round(uptime_pct, 2)
        })
        
    except Exception as e:
        app.logger.error(f"Error in compressor_metrics: {str(e)}", exc_info=True)
        return format_error(f"Failed to load compressor metrics: {str(e)}", 500)


@app.route('/api/equipment/blower', methods=['GET'])
def blower_metrics():
    """Get blower performance metrics"""
    try:
        start_time, end_time = get_time_range_params()
        
        # Get blower stats
        stats = db.session.query(
            func.avg(SensorReading.blower_vfd_speed).label('avg_speed'),
            func.avg(SensorReading.blower_discharge_pressure).label('avg_discharge_pressure'),
            func.avg(SensorReading.blower_suction_pressure).label('avg_suction_pressure'),
            func.avg(SensorReading.blower_suction_temp).label('avg_suction_temp')
        ).filter(
            SensorReading.timestamp.between(start_time, end_time)
        ).first()
        
        # Get running status
        uptime_data = db.session.query(
            func.sum(func.cast(SensorReading.blower_running, db.Integer)).label('running_count'),
            func.count(SensorReading.id).label('total_count')
        ).filter(
            SensorReading.timestamp.between(start_time, end_time)
        ).first()
        
        uptime_pct = (uptime_data.running_count / uptime_data.total_count * 100) if uptime_data.total_count > 0 else 0
        
        return format_response({
            'vfd_speed_hz': round(stats.avg_speed or 0, 2),
            'discharge_pressure_psi': round(stats.avg_discharge_pressure or 0, 2),
            'suction_pressure_psi': round(stats.avg_suction_pressure or 0, 2),
            'suction_temp_f': round(stats.avg_suction_temp or 0, 2),
            'uptime_percentage': round(uptime_pct, 2),
            'status': 'running' if uptime_pct > 50 else 'stopped'
        })
        
    except Exception as e:
        app.logger.error(f"Error in blower_metrics: {str(e)}", exc_info=True)
        return format_error(f"Failed to load blower metrics: {str(e)}", 500)


# ============================================================
# ALERTS & ANOMALIES ENDPOINTS
# ============================================================

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get anomalies and alerts"""
    try:
        hours = request.args.get('hours', 24, type=int)
        severity = request.args.get('severity', 'all')
        
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Build query
        query = db.session.query(Anomaly).filter(
            Anomaly.timestamp >= start_time
        )
        
        if severity != 'all':
            query = query.filter(Anomaly.severity == severity)
        
        # Get unresolved alerts first, then resolved
        query = query.order_by(
            Anomaly.resolved.asc(),
            Anomaly.severity.desc(),
            Anomaly.timestamp.desc()
        )
        
        alerts = query.limit(100).all()
        
        result = [alert.to_dict() for alert in alerts]
        
        return format_response(result)
        
    except Exception as e:
        app.logger.error(f"Error in get_alerts: {str(e)}", exc_info=True)
        return format_error(f"Failed to load alerts: {str(e)}", 500)


@app.route('/api/alerts/<int:alert_id>/acknowledge', methods=['POST'])
def acknowledge_alert(alert_id):
    """Acknowledge an alert"""
    try:
        alert = db.session.query(Anomaly).get(alert_id)
        
        if not alert:
            return format_error("Alert not found", 404)
        
        alert.acknowledged = True
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by = request.json.get('user', 'system')
        
        db.session.commit()
        
        return format_response(alert.to_dict(), "Alert acknowledged successfully")
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error acknowledging alert: {str(e)}", exc_info=True)
        return format_error(f"Failed to acknowledge alert: {str(e)}", 500)


# ============================================================
# MAINTENANCE ENDPOINTS
# ============================================================

@app.route('/api/maintenance/predictions', methods=['GET'])
def maintenance_predictions():
    """Get predictive maintenance recommendations"""
    try:
        # Get pending and upcoming maintenance events
        events = db.session.query(MaintenanceEvent).filter(
            MaintenanceEvent.status.in_(['pending', 'scheduled'])
        ).order_by(
            MaintenanceEvent.priority.desc(),
            MaintenanceEvent.predicted_failure_time.asc()
        ).limit(20).all()
        
        result = [event.to_dict() for event in events]
        
        return format_response(result)
        
    except Exception as e:
        app.logger.error(f"Error in maintenance_predictions: {str(e)}", exc_info=True)
        return format_error(f"Failed to load maintenance predictions: {str(e)}", 500)


# ============================================================
# ML MODEL STATUS ENDPOINT
# ============================================================

@app.route('/api/ml/model-status', methods=['GET'])
def ml_model_status():
    """Check which ML models are available"""
    try:
        models_dir = AppConfig.ML_MODELS_DIR
        
        model_files = {
            'lstm_forecaster': models_dir / 'lstm_forecaster.pth',
            'autoencoder': models_dir / 'autoencoder.pth',
            'vae': models_dir / 'vae.pth',
            'cnn_lstm': models_dir / 'cnn_lstm.pth',
        }
        
        status = {}
        for model_name, model_path in model_files.items():
            status[model_name] = model_path.exists()
        
        return format_response({
            'models': status,
            'models_directory': str(models_dir),
            'available_count': sum(status.values()),
            'total_count': len(status)
        })
        
    except Exception as e:
        app.logger.error(f"Error checking model status: {str(e)}", exc_info=True)
        return format_error(f"Failed to check model status: {str(e)}", 500)


# ============================================================
# RUN APPLICATION
# ============================================================

if __name__ == '__main__':
    print("\n" + "="*80)
    print("BIOGAS ANALYTICS PLATFORM - BACKEND API")
    print("="*80)
    print(f"Database: {AppConfig.SQLALCHEMY_DATABASE_URI}")
    print(f"API Host: {AppConfig.API_HOST}:{AppConfig.API_PORT}")
    print(f"Debug Mode: {AppConfig.DEBUG}")
    print(f"CORS Origins: {AppConfig.CORS_ORIGINS}")
    print("="*80 + "\n")
    
    app.run(
        host=AppConfig.API_HOST,
        port=AppConfig.API_PORT,
        debug=AppConfig.DEBUG
    )
