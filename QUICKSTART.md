# Quick Start Guide - Biogas Analytics Platform

## Overview

This guide will help you get the Biogas Analytics Platform up and running in **3 simple steps**:

1. **Process the CSV data** (30-45 minutes, one-time)
2. **Train ML models** (2-3 hours on T4 GPU, optional)
3. **Run the application** (instant)

---

## Prerequisites

- Python 3.9 or higher
- 20GB+ free disk space
- T4 GPU access (for ML training - Google Colab works great!)
- The `dut_complete.csv` file (17GB)

---

## Step 1: Process CSV Data → Database

The first step is to convert the 17GB CSV file into a SQLite database for fast queries.

### Install Dependencies

```bash
cd biogas-analytics/data-pipeline
pip install -r requirements.txt
```

### Run the ETL Pipeline

```bash
python scripts/load_to_database.py \
  --input ../../dut_complete.csv \
  --output ../instance/biogas.db
```

**What this does:**
- Reads CSV in 100K row chunks (memory-efficient)
- Processes and validates data
- Calculates derived metrics (gas quality, efficiency, health scores)
- Loads into SQLite database
- Creates hourly aggregates for fast queries
- Creates indexes for performance

**Expected Output:**
```
================================================================================
BIOGAS DATA ETL PIPELINE
================================================================================
Input CSV: /path/to/dut_complete.csv
Output DB: /path/to/biogas-analytics/instance/biogas.db
Chunk size: 100,000
================================================================================

Estimating total rows...
Estimated total rows: 21,740,129

Processing dut_complete.csv...
Chunk 1: Processed 100,000 / 21,740,129 rows (0.5%)
Chunk 2: Processed 200,000 / 21,740,129 rows (0.9%)
...
Chunk 218: Processed 21,800,000 / 21,740,129 rows (100.0%)

✓ Processing complete! Total rows: 21,740,129

Calculating hourly aggregates...
✓ Created 2,160 hourly aggregates

================================================================================
ETL COMPLETE
================================================================================
Total rows processed: 21,740,129
Total chunks: 218
Duration: 2,456.3 seconds (40.9 minutes)
Processing rate: 8,853 rows/second
Database size: 2.34 GB
Database location: /path/to/instance/biogas.db
================================================================================
```

**Time:** 30-45 minutes  
**Output:** `instance/biogas.db` (~2-3 GB)

### Test Mode (Optional)

To test the pipeline with just the first 100K rows:

```bash
python scripts/load_to_database.py \
  --input ../../dut_complete.csv \
  --output ../instance/biogas_test.db \
  --test-mode
```

**Time:** ~30 seconds  
**Output:** `instance/biogas_test.db` (~100 MB)

---

## Step 2: Train ML Models (Optional)

You can train deep learning models for forecasting and anomaly detection. This requires a GPU (T4 recommended).

### Option A: Google Colab (Recommended)

1. Upload `biogas.db` to Google Drive
2. Create a new Colab notebook
3. Mount Google Drive
4. Install dependencies and train models

```python
# In Colab
!pip install torch torchvision scikit-learn xgboost pandas numpy sqlalchemy flask-sqlalchemy tqdm

# Clone or upload the project
# Then run training
!python ml-models/scripts/train_all.py --use-gpu --epochs 100
```

### Option B: Local with GPU

```bash
cd ml-models
pip install -r requirements.txt
python scripts/train_all.py --use-gpu --epochs 100
```

**What gets trained:**
1. **LSTM Forecaster** - Predict gas production 1-24 hours ahead
2. **Autoencoder** - Anomaly detection via reconstruction error
3. **CNN-LSTM Hybrid** - Pattern recognition in sensor data
4. **XGBoost Maintenance Predictor** - Equipment failure prediction

**Time:** 2-3 hours on T4 GPU  
**Output:** 4 model files in `ml-models/trained_models/`

### Skip Training (Use Pre-trained Models)

If you don't want to train models, the platform will still work for analytics and visualization. ML features will be disabled until models are available.

---

## Step 3: Run the Application

### Backend API

```bash
cd backend
pip install -r requirements.txt
python app.py
```

**Output:**
```
 * Running on http://0.0.0.0:5001
 * Database: /path/to/instance/biogas.db
 * ML Models: 4 loaded
```

**API Endpoints:**
- http://localhost:5001/api/health
- http://localhost:5001/api/system/summary
- http://localhost:5001/api/gas/composition
- http://localhost:5001/api/equipment/compressor

### Frontend Dashboard (Coming Soon)

```bash
cd frontend
npm install
npm start
```

**Dashboard:** http://localhost:3000

---

## Verification

### Check Database

```bash
sqlite3 instance/biogas.db

# Check row count
SELECT COUNT(*) FROM sensor_readings;
-- Expected: ~21,740,000

# Check date range
SELECT MIN(timestamp), MAX(timestamp) FROM sensor_readings;
-- Expected: 2025-01-31 to 2025-04-30 (or similar)

# Check hourly aggregates
SELECT COUNT(*) FROM hourly_aggregates;
-- Expected: ~2,160 (90 days * 24 hours)

.quit
```

### Test API

```bash
# Health check
curl http://localhost:5001/api/health

# System summary (last 24 hours)
curl http://localhost:5001/api/system/summary?hours=24

# Gas composition
curl http://localhost:5001/api/gas/composition?hours=24
```

---

## Troubleshooting

### Issue: "Memory Error" during CSV processing

**Solution:** Reduce chunk size
```bash
python scripts/load_to_database.py \
  --input ../../dut_complete.csv \
  --chunk-size 50000  # Reduced from 100K
```

### Issue: "Database is locked"

**Solution:** Close any other connections to the database
```bash
# Kill any processes using the database
lsof | grep biogas.db
kill -9 <PID>
```

### Issue: "No module named 'shared'"

**Solution:** Make sure you're running from the correct directory
```bash
# Always run from the project subdirectories
cd biogas-analytics/data-pipeline
python scripts/load_to_database.py ...
```

### Issue: CSV processing is slow

**Expected:** 8,000-10,000 rows/second on modern hardware  
**If slower:** Check disk I/O (SSD recommended)

---

## Next Steps

1. ✅ **Data processed** → Database created
2. ⏳ **ML models training** → Optional but recommended
3. ⏳ **Backend API running** → Ready for queries
4. ⏳ **Frontend dashboard** → Coming soon

### What You Can Do Now:

- **Query the database** directly with SQL
- **Use the API** to get metrics and analytics
- **Train ML models** for predictions
- **Build custom dashboards** using the API

### Coming Soon:

- React frontend dashboard with Material-UI
- Real-time anomaly detection
- Predictive maintenance alerts
- Mobile app for monitoring

---

## Performance Tips

### Database Optimization

```sql
-- Create additional indexes for your queries
CREATE INDEX idx_timestamp_ch4 ON sensor_readings(timestamp, ch4_percent);
CREATE INDEX idx_comp_health ON sensor_readings(comp_motor_amps, system_health_score);
```

### Query Performance

- Use hourly aggregates for long time ranges (>7 days)
- Use sensor_readings for detailed analysis (<24 hours)
- Always filter by timestamp first

### ML Model Inference

- Models run on CPU for inference (fast enough)
- Batch predictions for better performance
- Cache predictions for frequently requested forecasts

---

## Support

For issues or questions:
1. Check the main `README.md`
2. Review `DATA_INSIGHTS.md` for data understanding
3. Check API logs in `backend/app.log`
4. Review database schema in `shared/data_layer/models.py`

---

## Summary

| Step | Time | Output | Required |
|------|------|--------|----------|
| 1. Process CSV | 30-45 min | Database (2-3 GB) | ✅ Yes |
| 2. Train Models | 2-3 hours | Model files (4 files) | ⚠️ Optional |
| 3. Run Backend | Instant | API server | ✅ Yes |
| 4. Run Frontend | Instant | Dashboard | ⏳ Coming Soon |

**Total Setup Time:** ~45 minutes (without ML training)  
**Total Setup Time:** ~3-4 hours (with ML training)

---

**You're all set! 🚀**

The platform is now ready to provide analytics, insights, and predictions for your biogas plant operations.
