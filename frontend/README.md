# Biogas Analytics Frontend

React-based dashboard for biogas plant monitoring and analytics.

## Features

### Static Data Dashboards
- **Overview** - System summary with KPIs and trends
- **Gas Composition** - CH4, CO2, and gas quality metrics
- **Equipment** - Compressor and blower monitoring
- **Anomalies** - Real-time anomaly detection and alerts
- **Maintenance** - Predictive maintenance recommendations

### ML Prediction Dashboards
- **Forecasting** - LSTM-based 1-24 hour production forecasts
- **Predictions** - Autoencoder/VAE anomaly detection and CNN-LSTM pattern recognition

## Quick Start

### Install Dependencies
```bash
npm install
```

### Configure API
Create `.env.local`:
```
REACT_APP_API_URL=http://localhost:5001/api
```

### Run Development Server
```bash
npm start
```

App runs at http://localhost:3000

### Build for Production
```bash
npm run build
```

## Tech Stack

- React 18
- Material-UI v5
- Recharts (charts)
- React Router v6
- Axios (API calls)
- Day.js (date handling)

## Dashboard Structure

```
src/
├── pages/              # Dashboard pages
│   ├── OverviewDashboard.js
│   ├── GasCompositionDashboard.js
│   ├── EquipmentDashboard.js
│   ├── AnomaliesDashboard.js
│   ├── MaintenanceDashboard.js
│   ├── ForecastingDashboard.js
│   └── PredictionsDashboard.js
├── components/
│   └── common/         # Reusable components
│       ├── Navbar.js
│       ├── KPICard.js
│       └── DashboardLayout.js
├── api/                # API integration
│   └── biogasApi.js
├── hooks/              # Custom hooks
│   └── useDashboardFilters.js
├── theme.js            # Material-UI theme
└── App.js              # Main app with routing
```

## ML Model Integration

The frontend gracefully handles missing ML models:
- Shows model status (trained/not trained)
- Provides training instructions
- Disables ML features if models unavailable
- No crashes, just informative messages

Train models on Google Colab, then place `.pth` files in `backend/ml-models/trained_models/`.

## API Endpoints Used

- `/api/health` - System health
- `/api/system/summary` - Overview metrics
- `/api/system/trends` - Time series data
- `/api/gas/composition` - Gas quality
- `/api/equipment/compressor` - Compressor metrics
- `/api/equipment/blower` - Blower metrics
- `/api/alerts` - Anomaly alerts
- `/api/maintenance/predictions` - Maintenance events
- `/api/ml/model-status` - ML model availability

## Customization

### Add New Dashboard
1. Create page in `src/pages/`
2. Add route in `App.js`
3. Add nav item in `Navbar.js`

### Modify Theme
Edit `src/theme.js` for colors, fonts, spacing.

### Add API Endpoint
Add function in `src/api/biogasApi.js`.
