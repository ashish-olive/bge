import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import theme from './theme';
import Navbar from './components/common/Navbar';

// Import dashboard pages
import OverviewDashboard from './pages/OverviewDashboard';
import GasCompositionDashboard from './pages/GasCompositionDashboard';
import EquipmentDashboard from './pages/EquipmentDashboard';
import AnomaliesDashboard from './pages/AnomaliesDashboard';
import MaintenanceDashboard from './pages/MaintenanceDashboard';
import ForecastingDashboard from './pages/ForecastingDashboard';
import PredictionsDashboard from './pages/PredictionsDashboard';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
            <Routes>
              {/* Static Data Dashboards */}
              <Route path="/" element={<OverviewDashboard />} />
              <Route path="/gas-composition" element={<GasCompositionDashboard />} />
              <Route path="/equipment" element={<EquipmentDashboard />} />
              <Route path="/anomalies" element={<AnomaliesDashboard />} />
              <Route path="/maintenance" element={<MaintenanceDashboard />} />
              
              {/* ML Prediction Dashboards */}
              <Route path="/forecasting" element={<ForecastingDashboard />} />
              <Route path="/predictions" element={<PredictionsDashboard />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
