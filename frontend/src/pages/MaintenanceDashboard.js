import React, { useState, useEffect, useCallback } from 'react';
import { 
  Grid, Paper, Typography, Box, Chip, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Alert, LinearProgress 
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DashboardLayout from '../components/common/DashboardLayout';
import { getMaintenancePredictions } from '../api/biogasApi';

const MaintenanceDashboard = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getMaintenancePredictions();
      setPredictions(response.data.data || []);
    } catch (err) {
      console.error('Error loading maintenance predictions:', err);
      setError('Failed to load maintenance predictions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'scheduled': return 'info';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'predicted': return <WarningAmberIcon />;
      case 'scheduled': return <ScheduleIcon />;
      case 'unplanned': return <BuildIcon />;
      default: return <BuildIcon />;
    }
  };

  const urgentEvents = predictions.filter(p => p.priority === 'urgent').length;
  const highPriorityEvents = predictions.filter(p => p.priority === 'high').length;
  const scheduledEvents = predictions.filter(p => p.status === 'scheduled').length;
  const pendingEvents = predictions.filter(p => p.status === 'pending').length;

  return (
    <DashboardLayout
      title="Predictive Maintenance"
      loading={loading}
      error={error}
      onRefresh={loadData}
    >
      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{urgentEvents}</Typography>
            <Typography variant="body2">Urgent Actions</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{highPriorityEvents}</Typography>
            <Typography variant="body2">High Priority</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{scheduledEvents}</Typography>
            <Typography variant="body2">Scheduled</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
            <Typography variant="h3" fontWeight="bold">{pendingEvents}</Typography>
            <Typography variant="body2">Pending Review</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* No Predictions Message */}
      {predictions.length === 0 && !loading && (
        <Alert severity="info" icon={<CheckCircleIcon />}>
          No maintenance events predicted or scheduled at this time. All equipment operating within normal parameters.
        </Alert>
      )}

      {/* Maintenance Predictions Table */}
      {predictions.length > 0 && (
        <Paper>
          <Box p={2} borderBottom={1} borderColor="divider">
            <Typography variant="h6" fontWeight={600}>
              Maintenance Events & Predictions
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Priority</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Equipment</TableCell>
                  <TableCell>Component</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Time to Failure</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {predictions.map((event) => (
                  <TableRow key={event.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Chip 
                        label={event.priority?.toUpperCase()} 
                        color={getPriorityColor(event.priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getEventTypeIcon(event.event_type)}
                        <Typography variant="body2">{event.event_type}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {event.equipment}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{event.component}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{event.description}</Typography>
                      {event.estimated_downtime_hours && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          Est. downtime: {event.estimated_downtime_hours}h
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.remaining_useful_life_hours ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {event.remaining_useful_life_hours.toFixed(0)} hours
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({(event.remaining_useful_life_hours / 24).toFixed(1)} days)
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.max(0, 100 - (event.remaining_useful_life_hours / 720 * 100))}
                            color={event.remaining_useful_life_hours < 168 ? 'error' : 'primary'}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">N/A</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.confidence ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {(event.confidence * 100).toFixed(0)}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={event.confidence * 100}
                            color={event.confidence > 0.8 ? 'success' : 'warning'}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">N/A</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={event.status} 
                        color={getStatusColor(event.status)}
                        size="small"
                        variant="outlined"
                      />
                      {event.scheduled_date && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          {new Date(event.scheduled_date).toLocaleDateString()}
                        </Typography>
                      )}
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
            Predictive Maintenance Features:
          </Typography>
          <Typography variant="body2" component="div">
            • <strong>ML-based Predictions:</strong> XGBoost model analyzes equipment health indicators<br />
            • <strong>Remaining Useful Life:</strong> Estimates time until component failure<br />
            • <strong>Confidence Scores:</strong> Model confidence in predictions (higher is better)<br />
            • <strong>Proactive Scheduling:</strong> Schedule maintenance before failures occur
          </Typography>
        </Alert>
      </Box>
    </DashboardLayout>
  );
};

export default MaintenanceDashboard;
