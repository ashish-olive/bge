"""
Database Models for Biogas Analytics Platform
SQLAlchemy ORM models for sensor data and analytics
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import Index

db = SQLAlchemy()


class SensorReading(db.Model):
    """
    Main table for sensor readings
    Stores time-series data from all sensors
    """
    __tablename__ = 'sensor_readings'
    
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    
    # Time features
    hour = db.Column(db.Integer)
    day_of_week = db.Column(db.Integer)
    day_of_month = db.Column(db.Integer)
    
    # Gas Composition (ABB GC)
    ch4_percent = db.Column(db.Float)  # Methane
    co2_percent = db.Column(db.Float)  # Carbon Dioxide
    n2_percent = db.Column(db.Float)   # Nitrogen
    o2_percent = db.Column(db.Float)   # Oxygen
    h2s_ppm = db.Column(db.Float)      # Hydrogen Sulfide
    gas_flow = db.Column(db.Float)
    gas_pressure = db.Column(db.Float)
    gas_temp = db.Column(db.Float)
    
    # Compressor System
    comp_discharge_pressure = db.Column(db.Float)
    comp_discharge_temp = db.Column(db.Float)
    comp_suction_pressure = db.Column(db.Float)
    comp_suction_temp = db.Column(db.Float)
    comp_motor_amps = db.Column(db.Float)
    comp_motor_speed = db.Column(db.Float)
    comp_oil_temp = db.Column(db.Float)
    comp_oil_pressure = db.Column(db.Float)
    comp_filter_diff_pressure = db.Column(db.Float)
    comp_running = db.Column(db.Boolean)
    comp_fault = db.Column(db.Boolean)
    
    # Blower System
    blower_discharge_pressure = db.Column(db.Float)
    blower_suction_pressure = db.Column(db.Float)
    blower_suction_temp = db.Column(db.Float)
    blower_vfd_speed = db.Column(db.Float)
    blower_running = db.Column(db.Boolean)
    blower_fault = db.Column(db.Boolean)
    
    # Safety & Control
    estop_1 = db.Column(db.Boolean)
    estop_2 = db.Column(db.Boolean)
    estop_3 = db.Column(db.Boolean)
    system_abort = db.Column(db.Boolean)
    
    # Energy Production
    daily_energy = db.Column(db.Float)
    accumulated_volume = db.Column(db.Float)
    
    # Derived Metrics
    gas_quality_score = db.Column(db.Float)
    compressor_efficiency = db.Column(db.Float)
    temp_differential = db.Column(db.Float)
    pressure_ratio = db.Column(db.Float)
    system_health_score = db.Column(db.Float)
    
    # Indexes for fast queries
    __table_args__ = (
        Index('idx_timestamp_hour', 'timestamp', 'hour'),
        Index('idx_health_score', 'system_health_score'),
    )
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ch4_percent': self.ch4_percent,
            'co2_percent': self.co2_percent,
            'gas_flow': self.gas_flow,
            'comp_motor_amps': self.comp_motor_amps,
            'system_health_score': self.system_health_score
        }


class HourlyAggregate(db.Model):
    """
    Hourly aggregated metrics for faster queries
    Pre-calculated statistics for each hour
    """
    __tablename__ = 'hourly_aggregates'
    
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, unique=True, index=True)
    
    # Gas Production
    avg_ch4 = db.Column(db.Float)
    avg_co2 = db.Column(db.Float)
    avg_flow = db.Column(db.Float)
    total_energy = db.Column(db.Float)
    
    # Equipment Performance
    avg_comp_amps = db.Column(db.Float)
    max_comp_amps = db.Column(db.Float)
    avg_comp_temp = db.Column(db.Float)
    max_comp_temp = db.Column(db.Float)
    
    # System Health
    avg_health_score = db.Column(db.Float)
    min_health_score = db.Column(db.Float)
    fault_count = db.Column(db.Integer)
    uptime_percentage = db.Column(db.Float)
    
    # Data Quality
    reading_count = db.Column(db.Integer)
    null_count = db.Column(db.Integer)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'avg_ch4': self.avg_ch4,
            'avg_co2': self.avg_co2,
            'avg_flow': self.avg_flow,
            'total_energy': self.total_energy,
            'avg_health_score': self.avg_health_score,
            'uptime_percentage': self.uptime_percentage
        }


class Anomaly(db.Model):
    """
    Detected anomalies and alerts
    """
    __tablename__ = 'anomalies'
    
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Anomaly Details
    anomaly_type = db.Column(db.String(50))  # 'statistical', 'ml', 'rule-based'
    severity = db.Column(db.String(20))  # 'low', 'medium', 'high', 'critical'
    confidence = db.Column(db.Float)  # 0-1
    
    # Affected System
    system = db.Column(db.String(50))  # 'compressor', 'blower', 'gas_quality', etc.
    sensor = db.Column(db.String(100))  # Specific sensor name
    
    # Values
    expected_value = db.Column(db.Float)
    actual_value = db.Column(db.Float)
    deviation = db.Column(db.Float)
    
    # Description & Actions
    description = db.Column(db.Text)
    recommended_action = db.Column(db.Text)
    
    # Status
    acknowledged = db.Column(db.Boolean, default=False)
    acknowledged_at = db.Column(db.DateTime)
    acknowledged_by = db.Column(db.String(100))
    resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime)
    
    __table_args__ = (
        Index('idx_severity_timestamp', 'severity', 'timestamp'),
        Index('idx_system_timestamp', 'system', 'timestamp'),
    )
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'anomaly_type': self.anomaly_type,
            'severity': self.severity,
            'confidence': self.confidence,
            'system': self.system,
            'sensor': self.sensor,
            'actual_value': self.actual_value,
            'expected_value': self.expected_value,
            'description': self.description,
            'recommended_action': self.recommended_action,
            'acknowledged': self.acknowledged,
            'resolved': self.resolved
        }


class MaintenanceEvent(db.Model):
    """
    Maintenance events and predictions
    """
    __tablename__ = 'maintenance_events'
    
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    
    # Event Details
    event_type = db.Column(db.String(50))  # 'predicted', 'scheduled', 'unplanned'
    equipment = db.Column(db.String(100))
    component = db.Column(db.String(100))
    
    # Prediction (if applicable)
    predicted_failure_time = db.Column(db.DateTime)
    confidence = db.Column(db.Float)
    remaining_useful_life_hours = db.Column(db.Float)
    
    # Maintenance Details
    description = db.Column(db.Text)
    priority = db.Column(db.String(20))  # 'low', 'medium', 'high', 'urgent'
    estimated_downtime_hours = db.Column(db.Float)
    
    # Status
    status = db.Column(db.String(20))  # 'pending', 'in_progress', 'completed', 'cancelled'
    scheduled_date = db.Column(db.DateTime)
    completed_date = db.Column(db.DateTime)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'event_type': self.event_type,
            'equipment': self.equipment,
            'component': self.component,
            'predicted_failure_time': self.predicted_failure_time.isoformat() if self.predicted_failure_time else None,
            'remaining_useful_life_hours': self.remaining_useful_life_hours,
            'description': self.description,
            'priority': self.priority,
            'status': self.status
        }


class ModelPrediction(db.Model):
    """
    ML model predictions for tracking and analysis
    """
    __tablename__ = 'model_predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    prediction_time = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Model Details
    model_name = db.Column(db.String(50))  # 'lstm_forecaster', 'autoencoder', etc.
    model_version = db.Column(db.String(20))
    
    # Prediction
    prediction_type = db.Column(db.String(50))  # 'forecast', 'anomaly', 'classification'
    prediction_horizon_hours = db.Column(db.Integer)
    predicted_value = db.Column(db.Float)
    confidence = db.Column(db.Float)
    
    # Actual (for validation)
    actual_value = db.Column(db.Float)
    error = db.Column(db.Float)
    
    # Metadata
    features_used = db.Column(db.Text)  # JSON string of features
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'model_name': self.model_name,
            'prediction_type': self.prediction_type,
            'predicted_value': self.predicted_value,
            'actual_value': self.actual_value,
            'confidence': self.confidence,
            'error': self.error
        }
