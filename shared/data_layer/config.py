"""
Configuration for Biogas Analytics Platform
"""
import os
from pathlib import Path

class AppConfig:
    """Application configuration"""
    
    # Base paths
    BASE_DIR = Path(__file__).parent.parent.parent
    INSTANCE_DIR = BASE_DIR / 'instance'
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        f'sqlite:///{INSTANCE_DIR}/biogas.db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Set to True for SQL debugging
    
    # API
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    API_PORT = int(os.getenv('API_PORT', 5001))
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Cache
    CACHE_TTL_SECONDS = int(os.getenv('CACHE_TTL_SECONDS', 300))  # 5 minutes
    
    # ML Models
    ML_MODELS_DIR = BASE_DIR / 'ml-models' / 'trained_models'
    USE_GPU = os.getenv('USE_GPU', 'False').lower() == 'true'
    
    # Data Processing
    CHUNK_SIZE = int(os.getenv('CHUNK_SIZE', 100000))
    MAX_WORKERS = int(os.getenv('MAX_WORKERS', 4))
    
    # Anomaly Detection Thresholds
    ANOMALY_THRESHOLDS = {
        'ch4_min': 65.0,  # Minimum CH4 percentage
        'ch4_max': 80.0,  # Maximum CH4 percentage
        'pressure_min': 15.0,  # PSI
        'pressure_max': 200.0,  # PSI
        'temp_max_delta': 10.0,  # Max temperature change in 5 minutes (°F)
        'motor_current_max_deviation': 20.0,  # Percentage
    }
    
    # Alert Settings
    ALERT_RETENTION_DAYS = int(os.getenv('ALERT_RETENTION_DAYS', 90))
    
    @classmethod
    def ensure_directories(cls):
        """Ensure required directories exist"""
        cls.INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
        cls.ML_MODELS_DIR.mkdir(parents=True, exist_ok=True)


# Sensor column mapping from CSV to database
SENSOR_COLUMN_MAPPING = {
    # Gas Composition
    'bop_plc_abb_gc_outletstream_ch4': 'ch4_percent',
    'bop_plc_abb_gc_outletstream_co2': 'co2_percent',
    'bop_plc_abb_gc_outletstream_n2': 'n2_percent',
    'bop_plc_abb_gc_outletstream_o2': 'o2_percent',
    'bop_plc_abb_gc_outletstream_h2s': 'h2s_ppm',
    'bop_plc_abb_gc_outletstream_flow': 'gas_flow',
    'bop_plc_abb_gc_outletstream_pressure': 'gas_pressure',
    'bop_plc_abb_gc_outletstream_temp': 'gas_temp',
    
    # Compressor
    'bop_plc_vl_comp_discharge_pressure': 'comp_discharge_pressure',
    'bop_plc_vl_comp_discharge_temp': 'comp_discharge_temp',
    'bop_plc_vl_comp_suction_pressure': 'comp_suction_pressure',
    'bop_plc_vl_comp_suction_temp': 'comp_suction_temp',
    'bop_plc_vl_comp_mainmotor_amps': 'comp_motor_amps',
    'bop_plc_vl_comp_mainmotor_speed_cmd': 'comp_motor_speed',
    'bop_plc_vl_comp_oilinjection_temp': 'comp_oil_temp',
    'bop_plc_vl_comp_netoildiff_pressure': 'comp_oil_pressure',
    'bop_plc_vl_comp_oilfilterdiff_pressure': 'comp_filter_diff_pressure',
    'bop_plc_vl_comp_runstatus': 'comp_running',
    'bop_plc_vl_comp_faultstatus': 'comp_fault',
    
    # Blower
    'bop_plc_bge_blowerdischarge_pressure': 'blower_discharge_pressure',
    'bop_plc_bge_blowersuction_pressure': 'blower_suction_pressure',
    'bop_plc_bge_blowersuction_temp': 'blower_suction_temp',
    'bop_plc_bge_blowervfd_speed': 'blower_vfd_speed',
    'bop_plc_bge_blowervfd_runstatus': 'blower_running',
    'bop_plc_bge_blowervfd_faultstatus': 'blower_fault',
    
    # Safety
    'bop_plc_in_hs901_estop': 'estop_1',
    'bop_plc_in_hs902_estop': 'estop_2',
    'bop_plc_in_hs903_estop': 'estop_3',
    'bop_plc_system_abort_0': 'system_abort',
    
    # Energy
    'bop_plc_inr_fc_todayenergy_real': 'daily_energy',
    'bop_plc_inr_fc_accvolume_real': 'accumulated_volume',
}
