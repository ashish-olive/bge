import React, { useState, useEffect, useCallback } from 'react';
import { 
  Grid, Paper, Typography, Box, Chip, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, Alert, IconButton, Tooltip 
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardLayout from '../components/common/DashboardLayout';
import useDashboardFilters from '../hooks/useDashboardFilters';
import { getAlerts, acknowledgeAlert } from '../api/biogasApi';

const AnomaliesDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { filters, handleHoursChange } = useDashboardFilters();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { hours: filters.hours, severity: 'all' };
      const response = await getAlerts(params);
      setAlerts(response.data.data || []);
    } catch (err) {
      console.error('Error loading alerts:', err);
      setError('Failed to load anomalies and alerts.');
    } finally {
      setLoading(false);
    }
  }, [filters.hours]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId, { user: 'Dashboard User' });
      loadData(); // Reload data
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'high': return <WarningAmberIcon color="error" />;
      case 'medium': return <WarningAmberIcon color="warning" />;
      case 'low': return <InfoIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getSystemColor = (system) => {
    switch (system) {
      case 'compressor': return 'primary';
      case 'blower': return 'secondary';
      case 'gas_quality': return 'success';
      default: return 'default';
    }
  };

  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  const severityCounts = {
    critical: alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
    high: alerts.filter(a => a.severity === 'high' && !a.resolved).length,
    medium: alerts.filter(a => a.severity === 'medium' && !a.resolved).length,
    low: alerts.filter(a => a.severity === 'low' && !a.resolved).length,
  };

  return (
    <DashboardLayout
      title="Anomalies & Alerts"
      loading={loading}
      error={error}
      onRefresh={loadData}
      filters={filters}
      onHoursChange={handleHoursChange}
    >
      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{severityCounts.critical}</Typography>
            <Typography variant="body2">Critical Alerts</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{severityCounts.high}</Typography>
            <Typography variant="body2">High Priority</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{severityCounts.medium}</Typography>
            <Typography variant="body2">Medium Priority</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{resolvedAlerts.length}</Typography>
            <Typography variant="body2">Resolved</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Active Alerts */}
      {unresolvedAlerts.length === 0 && !loading && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}>
          No active anomalies detected. All systems operating normally.
        </Alert>
      )}

      {unresolvedAlerts.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box p={2} borderBottom={1} borderColor="divider">
            <Typography variant="h6" fontWeight={600}>
              Active Anomalies ({unresolvedAlerts.length})
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Severity</TableCell>
                  <TableCell>System</TableCell>
                  <TableCell>Sensor</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Detected</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unresolvedAlerts.map((alert) => (
                  <TableRow key={alert.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getSeverityIcon(alert.severity)}
                        <Chip 
                          label={alert.severity?.toUpperCase()} 
                          color={getSeverityColor(alert.severity)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={alert.system} 
                        color={getSystemColor(alert.system)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {alert.sensor}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{alert.description}</Typography>
                      {alert.recommended_action && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          → {alert.recommended_action}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {alert.actual_value?.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Expected: {alert.expected_value?.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {!alert.acknowledged ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleAcknowledge(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      ) : (
                        <Chip label="Acknowledged" size="small" color="success" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <Paper>
          <Box p={2} borderBottom={1} borderColor="divider">
            <Typography variant="h6" fontWeight={600} color="text.secondary">
              Resolved Anomalies ({resolvedAlerts.length})
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Severity</TableCell>
                  <TableCell>System</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Detected</TableCell>
                  <TableCell>Resolved</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resolvedAlerts.slice(0, 10).map((alert) => (
                  <TableRow key={alert.id} sx={{ opacity: 0.6 }}>
                    <TableCell>
                      <Chip 
                        label={alert.severity?.toUpperCase()} 
                        color={getSeverityColor(alert.severity)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={alert.system} 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{alert.description}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        {alert.resolved_at ? new Date(alert.resolved_at).toLocaleString() : 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Info Box */}
      <Box mt={3}>
        <Alert severity="info">
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Anomaly Detection Methods:
          </Typography>
          <Typography variant="body2" component="div">
            • <strong>Statistical:</strong> Z-score, IQR, Isolation Forest<br />
            • <strong>ML-based:</strong> Autoencoder reconstruction error, One-Class SVM<br />
            • <strong>Rule-based:</strong> Domain-specific thresholds (pressure, temperature, gas composition)
          </Typography>
        </Alert>
      </Box>
    </DashboardLayout>
  );
};

export default AnomaliesDashboard;
