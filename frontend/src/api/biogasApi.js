import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.params);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ============================================================
// SYSTEM ENDPOINTS
// ============================================================

export const getHealth = () => api.get('/health');

export const getSystemSummary = (params = {}) => api.get('/system/summary', { params });

export const getSystemTrends = (params = {}) => api.get('/system/trends', { params });

// ============================================================
// GAS COMPOSITION ENDPOINTS
// ============================================================

export const getGasComposition = (params = {}) => api.get('/gas/composition', { params });

export const getGasTrends = (params = {}) => api.get('/gas/trends', { params });

// ============================================================
// EQUIPMENT ENDPOINTS
// ============================================================

export const getCompressorMetrics = (params = {}) => api.get('/equipment/compressor', { params });

export const getBlowerMetrics = (params = {}) => api.get('/equipment/blower', { params });

// ============================================================
// ALERTS & ANOMALIES ENDPOINTS
// ============================================================

export const getAlerts = (params = {}) => api.get('/alerts', { params });

export const acknowledgeAlert = (alertId, data = {}) => 
  api.post(`/alerts/${alertId}/acknowledge`, data);

// ============================================================
// MAINTENANCE ENDPOINTS
// ============================================================

export const getMaintenancePredictions = () => api.get('/maintenance/predictions');

// ============================================================
// ML PREDICTION ENDPOINTS
// ============================================================

export const getForecast = (data) => api.post('/ml/forecast', data);

export const detectAnomalies = (data) => api.post('/ml/detect-anomalies', data);

export const getModelStatus = () => api.get('/ml/model-status');

export default api;
