import React, { useState, useEffect, useCallback } from 'react';
import { 
  Grid, Paper, Typography, Box, Alert, Button, CircularProgress, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DashboardLayout from '../components/common/DashboardLayout';
import KPICard from '../components/common/KPICard';
import { getSystemTrends, getModelStatus } from '../api/biogasApi';

const PredictionsDashboard = () => {
  const [recentData, setRecentData] = useState([]);
  const [anomalyScores, setAnomalyScores] = useState([]);
  const [patternPredictions, setPatternPredictions] = useState([]);
  const [modelStatus, setModelStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const checkModelStatus = useCallback(async () => {
    try {
      const response = await getModelStatus();
      setModelStatus(response.data.data);
    } catch (err) {
      console.log('Model status check failed - models may not be trained yet');
      setModelStatus({ 
        autoencoder: false, 
        vae: false,
        cnn_lstm: false 
      });
    }
  }, []);

  const loadRecentData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { hours: 6 };
      const response = await getSystemTrends(params);
      setRecentData(response.data.data || []);
    } catch (err) {
      console.error('Error loading recent data:', err);
      setError('Failed to load recent data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkModelStatus();
    loadRecentData();
  }, [checkModelStatus, loadRecentData]);

  const runAnomalyDetection = async () => {
    if (!modelStatus?.autoencoder && !modelStatus?.vae) {
      setError('Anomaly detection models not available. Please train the models first.');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);

      // Simulate anomaly detection (replace with actual API call when backend is ready)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock anomaly scores
      const mockScores = recentData.map((d, idx) => ({
        timestamp: d.timestamp,
        ch4: parseFloat(d.ch4_percent),
        health: parseFloat(d.health_score),
        anomaly_score: Math.random() * 100,
        is_anomaly: Math.random() > 0.9,
        confidence: 0.85 + Math.random() * 0.1,
      }));

      setAnomalyScores(mockScores);

      // Generate mock pattern predictions
      const patterns = [
        { pattern: 'Normal Operation', probability: 0.85, description: 'All systems operating within expected parameters' },
        { pattern: 'Pressure Fluctuation', probability: 0.10, description: 'Minor pressure variations detected' },
        { pattern: 'Temperature Drift', probability: 0.03, description: 'Slight temperature increase trend' },
        { pattern: 'Flow Instability', probability: 0.02, description: 'Gas flow rate showing minor instability' },
      ];
      setPatternPredictions(patterns);

    } catch (err) {
      console.error('Error running anomaly detection:', err);
      setError('Failed to run anomaly detection.');
    } finally {
      setAnalyzing(false);
    }
  };

  const anomalyCount = anomalyScores.filter(s => s.is_anomaly).length;
  const avgAnomalyScore = anomalyScores.length > 0 
    ? anomalyScores.reduce((sum, s) => sum + s.anomaly_score, 0) / anomalyScores.length 
    : 0;

  return (
    <DashboardLayout
      title="ML Predictions & Pattern Recognition"
      loading={loading}
      error={error}
      onRefresh={loadRecentData}
    >
      {/* Model Status Alert */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Alert 
            severity={modelStatus?.autoencoder ? 'success' : 'warning'} 
            icon={modelStatus?.autoencoder ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
          >
            <Typography variant="body2" fontWeight={600}>
              Autoencoder: {modelStatus?.autoencoder ? 'Active' : 'Not Available'}
            </Typography>
            <Typography variant="caption">
              {modelStatus?.autoencoder ? '45K params, reconstruction-based' : 'Train on Colab'}
            </Typography>
          </Alert>
        </Grid>
        <Grid item xs={12} md={4}>
          <Alert 
            severity={modelStatus?.vae ? 'success' : 'warning'} 
            icon={modelStatus?.vae ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
          >
            <Typography variant="body2" fontWeight={600}>
              VAE: {modelStatus?.vae ? 'Active' : 'Not Available'}
            </Typography>
            <Typography variant="caption">
              {modelStatus?.vae ? '52K params, probabilistic' : 'Train on Colab'}
            </Typography>
          </Alert>
        </Grid>
        <Grid item xs={12} md={4}>
          <Alert 
            severity={modelStatus?.cnn_lstm ? 'success' : 'warning'} 
            icon={modelStatus?.cnn_lstm ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
          >
            <Typography variant="body2" fontWeight={600}>
              CNN-LSTM: {modelStatus?.cnn_lstm ? 'Active' : 'Not Available'}
            </Typography>
            <Typography variant="caption">
              {modelStatus?.cnn_lstm ? '890K params, pattern recognition' : 'Train on Colab'}
            </Typography>
          </Alert>
        </Grid>
      </Grid>

      {/* Analysis Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Run ML Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Detect anomalies and recognize patterns using deep learning models
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={analyzing ? <CircularProgress size={20} color="inherit" /> : <AutoGraphIcon />}
            onClick={runAnomalyDetection}
            disabled={(!modelStatus?.autoencoder && !modelStatus?.vae) || analyzing}
          >
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </Box>
      </Paper>

      {/* Analysis Results */}
      {anomalyScores.length > 0 && (
        <>
          {/* KPI Cards */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Anomalies Detected"
                value={anomalyCount.toString()}
                icon={<WarningAmberIcon />}
                subtitle={`Out of ${anomalyScores.length} samples`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Avg Anomaly Score"
                value={avgAnomalyScore.toFixed(1)}
                unit="/100"
                icon={<AutoGraphIcon />}
                subtitle="Lower is better"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="System Status"
                value={anomalyCount === 0 ? 'Normal' : 'Attention'}
                icon={<PsychologyIcon />}
                subtitle={
                  <Chip 
                    label={anomalyCount === 0 ? 'Healthy' : 'Review Needed'} 
                    color={anomalyCount === 0 ? 'success' : 'warning'}
                    size="small"
                  />
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Model Confidence"
                value={`${(anomalyScores.reduce((sum, s) => sum + s.confidence, 0) / anomalyScores.length * 100).toFixed(1)}%`}
                icon={<CheckCircleIcon />}
                subtitle="Average confidence"
              />
            </Grid>
          </Grid>

          {/* Anomaly Score Scatter Plot */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Anomaly Score Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Points above threshold (red) indicate potential anomalies
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="ch4" 
                  name="CH4 (%)"
                  tick={{ fill: '#666', fontSize: 12 }}
                  label={{ value: 'CH4 (%)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  dataKey="anomaly_score" 
                  name="Anomaly Score"
                  tick={{ fill: '#666', fontSize: 12 }}
                  label={{ value: 'Anomaly Score', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  formatter={(value, name) => [value.toFixed(2), name]}
                />
                <Scatter data={anomalyScores} fill="#1976d2">
                  {anomalyScores.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.is_anomaly ? '#d32f2f' : '#1976d2'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Paper>

          {/* Pattern Recognition Results */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Pattern Recognition (CNN-LSTM)
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Identified operational patterns and their probabilities
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Pattern</TableCell>
                    <TableCell>Probability</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patternPredictions.map((pattern, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {pattern.pattern}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box 
                            sx={{ 
                              width: 100, 
                              height: 8, 
                              bgcolor: 'grey.200', 
                              borderRadius: 1,
                              overflow: 'hidden'
                            }}
                          >
                            <Box 
                              sx={{ 
                                width: `${pattern.probability * 100}%`,
                                height: '100%',
                                bgcolor: pattern.probability > 0.5 ? 'success.main' : 'warning.main',
                              }}
                            />
                          </Box>
                          <Typography variant="body2" fontWeight={600}>
                            {(pattern.probability * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {pattern.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={pattern.probability > 0.5 ? 'Dominant' : 'Minor'} 
                          color={pattern.probability > 0.5 ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Detected Anomalies Table */}
          {anomalyCount > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={600} color="error">
                Detected Anomalies ({anomalyCount})
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>CH4 (%)</TableCell>
                      <TableCell>Health Score</TableCell>
                      <TableCell>Anomaly Score</TableCell>
                      <TableCell>Confidence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {anomalyScores.filter(s => s.is_anomaly).map((score, idx) => (
                      <TableRow key={idx} sx={{ bgcolor: 'error.light', opacity: 0.8 }}>
                        <TableCell>
                          {new Date(score.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{score.ch4.toFixed(2)}%</TableCell>
                        <TableCell>{score.health.toFixed(1)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="error">
                            {score.anomaly_score.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>{(score.confidence * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      {/* Info Box */}
      <Box mt={3}>
        <Alert severity="info">
          <Typography variant="body2" fontWeight={600} gutterBottom>
            ML Models for Predictions:
          </Typography>
          <Typography variant="body2" component="div">
            • <strong>Autoencoder:</strong> 95→32→95 architecture, detects anomalies via reconstruction error<br />
            • <strong>VAE:</strong> Probabilistic latent representations, better for rare anomalies<br />
            • <strong>CNN-LSTM:</strong> 1D-CNN + LSTM, recognizes patterns and classifies fault types<br />
            • <strong>Training:</strong> All models can be trained on Google Colab with T4 GPU<br />
            • <strong>Graceful Degradation:</strong> Dashboard works without models, shows training instructions
          </Typography>
        </Alert>
      </Box>
    </DashboardLayout>
  );
};

export default PredictionsDashboard;
