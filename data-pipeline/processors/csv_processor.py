"""
CSV Processor for Large Biogas Data Files
Handles chunked reading and processing of 17GB+ CSV files
"""
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import sys

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


class BiogasCSVProcessor:
    """Process large biogas CSV files in chunks"""
    
    def __init__(self, chunk_size=100000):
        """
        Initialize processor
        
        Args:
            chunk_size: Number of rows to process at a time
        """
        self.chunk_size = chunk_size
        self.total_rows = 0
        self.processed_rows = 0
        
    def estimate_total_rows(self, filepath):
        """Estimate total rows in CSV file"""
        print("Estimating total rows...")
        
        # Read sample to get average row size
        sample_df = pd.read_csv(filepath, nrows=1000)
        
        # Get file size
        file_size = Path(filepath).stat().st_size
        
        # Estimate based on sample
        with open(filepath, 'r') as f:
            header = f.readline()
            header_size = len(header.encode('utf-8'))
            
            # Read sample rows
            sample_data = []
            for i in range(1000):
                line = f.readline()
                if not line:
                    break
                sample_data.append(len(line.encode('utf-8')))
        
        avg_row_size = np.mean(sample_data)
        estimated_rows = int((file_size - header_size) / avg_row_size)
        
        print(f"Estimated total rows: {estimated_rows:,}")
        return estimated_rows
    
    def process_chunk(self, chunk_df):
        """
        Process a single chunk of data
        
        Args:
            chunk_df: DataFrame chunk
            
        Returns:
            Processed DataFrame
        """
        # Convert timestamp to datetime
        chunk_df['timestamp'] = pd.to_datetime(chunk_df['timestamp'], errors='coerce')
        
        # Extract time features
        chunk_df['hour'] = chunk_df['timestamp'].dt.hour
        chunk_df['day_of_week'] = chunk_df['timestamp'].dt.dayofweek
        chunk_df['day_of_month'] = chunk_df['timestamp'].dt.day
        
        # Convert boolean columns (t/f) to proper boolean
        bool_columns = chunk_df.select_dtypes(include=['object']).columns
        for col in bool_columns:
            if col != 'timestamp':  # Skip timestamp
                unique_vals = chunk_df[col].unique()
                if set(unique_vals).issubset({'t', 'f', 'T', 'F', None}):
                    chunk_df[col] = chunk_df[col].map({'t': True, 'T': True, 'f': False, 'F': False})
        
        # Calculate derived metrics
        chunk_df = self._calculate_derived_metrics(chunk_df)
        
        return chunk_df
    
    def _calculate_derived_metrics(self, df):
        """Calculate derived metrics from raw sensor data"""
        
        # Gas quality score (weighted average of CH4 and CO2)
        if 'bop_plc_abb_gc_outletstream_ch4' in df.columns and 'bop_plc_abb_gc_outletstream_co2' in df.columns:
            df['gas_quality_score'] = (
                df['bop_plc_abb_gc_outletstream_ch4'] * 0.7 +  # CH4 weight
                (100 - df['bop_plc_abb_gc_outletstream_co2']) * 0.3  # Inverse CO2 weight
            )
        
        # Compressor efficiency (simplified)
        if 'bop_plc_vl_comp_discharge_pressure' in df.columns and 'bop_plc_vl_comp_mainmotor_amps' in df.columns:
            df['compressor_efficiency'] = (
                df['bop_plc_vl_comp_discharge_pressure'] / 
                (df['bop_plc_vl_comp_mainmotor_amps'] + 1)  # Avoid division by zero
            )
        
        # Temperature differential (discharge - suction)
        if 'bop_plc_vl_comp_discharge_temp' in df.columns and 'bop_plc_vl_comp_suction_temp' in df.columns:
            df['temp_differential'] = (
                df['bop_plc_vl_comp_discharge_temp'] - 
                df['bop_plc_vl_comp_suction_temp']
            )
        
        # Pressure ratio
        if 'bop_plc_vl_comp_discharge_pressure' in df.columns and 'bop_plc_vl_comp_suction_pressure' in df.columns:
            df['pressure_ratio'] = (
                df['bop_plc_vl_comp_discharge_pressure'] / 
                (df['bop_plc_vl_comp_suction_pressure'] + 0.1)  # Avoid division by zero
            )
        
        # System health score (0-100)
        health_factors = []
        
        # Check for faults
        fault_cols = [col for col in df.columns if 'fault' in col.lower()]
        if fault_cols:
            fault_score = 100 - (df[fault_cols].sum(axis=1) * 10)
            health_factors.append(fault_score)
        
        # Check motor current (normalized)
        if 'bop_plc_vl_comp_mainmotor_amps' in df.columns:
            current_score = 100 - (df['bop_plc_vl_comp_mainmotor_amps'] / 100 * 20)
            health_factors.append(current_score)
        
        if health_factors:
            df['system_health_score'] = np.mean(health_factors, axis=0)
            df['system_health_score'] = df['system_health_score'].clip(0, 100)
        
        return df
    
    def process_file(self, input_filepath, callback=None):
        """
        Process entire CSV file in chunks
        
        Args:
            input_filepath: Path to input CSV file
            callback: Optional callback function(chunk_df, progress) called for each chunk
            
        Yields:
            Processed DataFrame chunks
        """
        input_path = Path(input_filepath)
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_filepath}")
        
        # Estimate total rows
        self.total_rows = self.estimate_total_rows(input_filepath)
        self.processed_rows = 0
        
        print(f"\nProcessing {input_path.name}...")
        print(f"Chunk size: {self.chunk_size:,} rows")
        print(f"Estimated chunks: {self.total_rows // self.chunk_size + 1}")
        print()
        
        # Process in chunks
        chunk_iterator = pd.read_csv(
            input_filepath,
            chunksize=self.chunk_size,
            low_memory=False
        )
        
        for i, chunk_df in enumerate(chunk_iterator, 1):
            # Process chunk
            processed_chunk = self.process_chunk(chunk_df)
            
            # Update progress
            self.processed_rows += len(chunk_df)
            progress = (self.processed_rows / self.total_rows) * 100
            
            print(f"Chunk {i}: Processed {self.processed_rows:,} / {self.total_rows:,} rows ({progress:.1f}%)")
            
            # Call callback if provided
            if callback:
                callback(processed_chunk, progress)
            
            yield processed_chunk
        
        print(f"\n✓ Processing complete! Total rows: {self.processed_rows:,}")
    
    def get_column_statistics(self, filepath, sample_size=10000):
        """
        Get statistics for all columns
        
        Args:
            filepath: Path to CSV file
            sample_size: Number of rows to sample
            
        Returns:
            Dictionary of column statistics
        """
        print(f"Analyzing column statistics (sample: {sample_size:,} rows)...")
        
        # Read sample
        df_sample = pd.read_csv(filepath, nrows=sample_size, low_memory=False)
        
        stats = {}
        for col in df_sample.columns:
            col_stats = {
                'dtype': str(df_sample[col].dtype),
                'null_count': int(df_sample[col].isnull().sum()),
                'null_percentage': float(df_sample[col].isnull().sum() / len(df_sample) * 100),
                'unique_count': int(df_sample[col].nunique())
            }
            
            # Numeric columns
            if df_sample[col].dtype in ['int64', 'float64']:
                col_stats.update({
                    'min': float(df_sample[col].min()),
                    'max': float(df_sample[col].max()),
                    'mean': float(df_sample[col].mean()),
                    'std': float(df_sample[col].std()),
                    'median': float(df_sample[col].median())
                })
            
            stats[col] = col_stats
        
        return stats


if __name__ == '__main__':
    # Test the processor
    import argparse
    
    parser = argparse.ArgumentParser(description='Process biogas CSV file')
    parser.add_argument('--input', type=str, required=True, help='Input CSV file path')
    parser.add_argument('--chunk-size', type=int, default=100000, help='Chunk size for processing')
    parser.add_argument('--stats-only', action='store_true', help='Only show statistics')
    args = parser.parse_args()
    
    processor = BiogasCSVProcessor(chunk_size=args.chunk_size)
    
    if args.stats_only:
        # Show statistics only
        stats = processor.get_column_statistics(args.input)
        print("\nColumn Statistics:")
        print("=" * 80)
        for col, col_stats in stats.items():
            print(f"\n{col}:")
            for key, value in col_stats.items():
                print(f"  {key}: {value}")
    else:
        # Process file
        chunk_count = 0
        for chunk in processor.process_file(args.input):
            chunk_count += 1
            print(f"  Chunk shape: {chunk.shape}")
        
        print(f"\nProcessed {chunk_count} chunks successfully!")
