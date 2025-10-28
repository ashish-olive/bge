"""
ETL Script: Load CSV Data to Database
Processes large CSV file and loads into SQLite database
"""
import sys
from pathlib import Path
import argparse
from datetime import datetime
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Add data-pipeline to path for local imports
data_pipeline_root = Path(__file__).parent.parent
sys.path.insert(0, str(data_pipeline_root))

from shared.data_layer.models import db, SensorReading, HourlyAggregate
from shared.data_layer.config import AppConfig, SENSOR_COLUMN_MAPPING
from processors.csv_processor import BiogasCSVProcessor
from flask import Flask


def create_database(db_path):
    """Create database and tables"""
    print(f"Creating database at: {db_path}")
    
    # Ensure directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Create Flask app
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize database
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        print("✓ Database tables created")
    
    return app


def map_columns(chunk_df):
    """Map CSV columns to database columns"""
    mapped_data = {}
    
    # Always include timestamp and derived features
    if 'timestamp' in chunk_df.columns:
        mapped_data['timestamp'] = chunk_df['timestamp']
    if 'hour' in chunk_df.columns:
        mapped_data['hour'] = chunk_df['hour']
    if 'day_of_week' in chunk_df.columns:
        mapped_data['day_of_week'] = chunk_df['day_of_week']
    if 'day_of_month' in chunk_df.columns:
        mapped_data['day_of_month'] = chunk_df['day_of_month']
    
    # Map sensor columns
    for csv_col, db_col in SENSOR_COLUMN_MAPPING.items():
        if csv_col in chunk_df.columns:
            mapped_data[db_col] = chunk_df[csv_col]
    
    # Include derived metrics
    derived_cols = ['gas_quality_score', 'compressor_efficiency', 
                    'temp_differential', 'pressure_ratio', 'system_health_score']
    for col in derived_cols:
        if col in chunk_df.columns:
            mapped_data[col] = chunk_df[col]
    
    return pd.DataFrame(mapped_data)


def load_chunk_to_db(chunk_df, engine, batch_size=10000):
    """Load a chunk of data to database"""
    # Map columns
    mapped_df = map_columns(chunk_df)
    
    # Load to database in batches
    mapped_df.to_sql(
        'sensor_readings',
        engine,
        if_exists='append',
        index=False,
        chunksize=batch_size,
        method='multi'
    )


def calculate_hourly_aggregates(app, start_time=None, end_time=None):
    """Calculate hourly aggregates from sensor readings"""
    print("\nCalculating hourly aggregates...")
    
    with app.app_context():
        # Query to get hourly aggregates
        query = """
        INSERT INTO hourly_aggregates (
            timestamp, avg_ch4, avg_co2, avg_flow, total_energy,
            avg_comp_amps, max_comp_amps, avg_comp_temp, max_comp_temp,
            avg_health_score, min_health_score, fault_count, uptime_percentage,
            reading_count, null_count
        )
        SELECT
            datetime(strftime('%Y-%m-%d %H:00:00', timestamp)) as hour_timestamp,
            AVG(ch4_percent) as avg_ch4,
            AVG(co2_percent) as avg_co2,
            AVG(gas_flow) as avg_flow,
            SUM(daily_energy) as total_energy,
            AVG(comp_motor_amps) as avg_comp_amps,
            MAX(comp_motor_amps) as max_comp_amps,
            AVG(comp_discharge_temp) as avg_comp_temp,
            MAX(comp_discharge_temp) as max_comp_temp,
            AVG(system_health_score) as avg_health_score,
            MIN(system_health_score) as min_health_score,
            SUM(CASE WHEN comp_fault = 1 OR blower_fault = 1 THEN 1 ELSE 0 END) as fault_count,
            (SUM(CASE WHEN comp_running = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as uptime_percentage,
            COUNT(*) as reading_count,
            SUM(CASE WHEN ch4_percent IS NULL THEN 1 ELSE 0 END) as null_count
        FROM sensor_readings
        GROUP BY hour_timestamp
        """
        
        db.session.execute(query)
        db.session.commit()
        
        # Get count
        count = db.session.query(HourlyAggregate).count()
        print(f"✓ Created {count:,} hourly aggregates")


def main():
    parser = argparse.ArgumentParser(description='Load biogas CSV data to database')
    parser.add_argument('--input', type=str, required=True, help='Input CSV file path')
    parser.add_argument('--output', type=str, help='Output database path (default: instance/biogas.db)')
    parser.add_argument('--chunk-size', type=int, default=100000, help='Chunk size for processing')
    parser.add_argument('--skip-aggregates', action='store_true', help='Skip hourly aggregates calculation')
    parser.add_argument('--test-mode', action='store_true', help='Process only first 100K rows for testing')
    args = parser.parse_args()
    
    # Setup paths
    input_path = Path(args.input).resolve()
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        return 1
    
    if args.output:
        db_path = Path(args.output).resolve()
    else:
        db_path = project_root / 'instance' / 'biogas.db'
    
    print("="*80)
    print("BIOGAS DATA ETL PIPELINE")
    print("="*80)
    print(f"Input CSV: {input_path}")
    print(f"Output DB: {db_path}")
    print(f"Chunk size: {args.chunk_size:,}")
    if args.test_mode:
        print("⚠️  TEST MODE: Processing only first 100K rows")
    print("="*80)
    print()
    
    # Create database
    app = create_database(db_path)
    engine = create_engine(f'sqlite:///{db_path}')
    
    # Process CSV
    processor = BiogasCSVProcessor(chunk_size=args.chunk_size)
    
    start_time = datetime.now()
    chunk_count = 0
    total_rows = 0
    
    try:
        for chunk_df in processor.process_file(input_path):
            # Load to database
            load_chunk_to_db(chunk_df, engine)
            
            chunk_count += 1
            total_rows += len(chunk_df)
            
            # Test mode: stop after first chunk
            if args.test_mode and chunk_count >= 1:
                print("\n⚠️  Test mode: Stopping after first chunk")
                break
        
        # Calculate hourly aggregates
        if not args.skip_aggregates:
            calculate_hourly_aggregates(app)
        
        # Summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print("\n" + "="*80)
        print("ETL COMPLETE")
        print("="*80)
        print(f"Total rows processed: {total_rows:,}")
        print(f"Total chunks: {chunk_count}")
        print(f"Duration: {duration:.1f} seconds ({duration/60:.1f} minutes)")
        print(f"Processing rate: {total_rows/duration:.0f} rows/second")
        print(f"Database size: {db_path.stat().st_size / (1024**3):.2f} GB")
        print(f"Database location: {db_path}")
        print("="*80)
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Error during ETL: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
