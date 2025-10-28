import React, { useState, useEffect, useCallback } from 'react';
import { Grid, Paper, Typography, Box, Chip } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import CompressIcon from '@mui/icons-material/Compress';
import SpeedIcon from '@mui/icons-material/Speed';
import KPICard from '../components/common/KPICard';
import DashboardLayout from '../components/common/DashboardLayout';
import useDashboardFilters from '../hooks/useDashboardFilters';
import { getCompressorMetrics, getBlowerMetrics } from '../api/biogasApi';

const EquipmentDashboard = () => {
  const [compressor, setCompressor] = useState(null);
  const [blower, setBlower] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { filters, handleHoursChange } = useDashboardFilters();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { hours: filters.hours };
      const [compressorRes, blowerRes] = await Promise.all([
        getCompressorMetrics(params),
        getBlowerMetrics(params)
      ]);

      setCompressor(compressorRes.data.data);
      setBlower(blowerRes.data.data);
    } catch (err) {
      console.error('Error loading equipment data:', err);
      setError('Failed to load equipment data.');
    } finally {
      setLoading(false);
    }
  }, [filters.hours]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'error';
      case 'good': return 'success';
      case 'needs_attention': return 'warning';
      default: return 'default';
    }
  };

  return (
    <DashboardLayout
      title="Equipment Monitoring"
      loading={loading}
      error={error}
      onRefresh={loadData}
      filters={filters}
      onHoursChange={handleHoursChange}
    >
      {/* Compressor Section */}
      <Typography variant="h5" gutterBottom fontWeight={600} mb={2}>
        Compressor System
      </Typography>
      
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Motor Current"
            value={compressor?.motor?.avg_current_amps?.toFixed(1) || '0'}
            unit="A"
            icon={<PrecisionManufacturingIcon />}
            loading={loading}
            subtitle={`Max: ${compressor?.motor?.max_current_amps?.toFixed(1) || 0}A`}
            tooltip="Motor current draw. High values may indicate mechanical issues"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Discharge Pressure"
            value={compressor?.pressure?.avg_discharge_psi?.toFixed(1) || '0'}
            unit="PSI"
            icon={<CompressIcon />}
            loading={loading}
            tooltip="Compressor discharge pressure"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Discharge Temperature"
            value={compressor?.temperature?.avg_discharge_f?.toFixed(1) || '0'}
            unit="°F"
            icon={<ThermostatIcon />}
            loading={loading}
            subtitle={`Max: ${compressor?.temperature?.max_discharge_f?.toFixed(1) || 0}°F`}
            tooltip="Discharge temperature. High temps indicate cooling issues"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Uptime"
            value={`${compressor?.uptime_percentage?.toFixed(1) || 0}%`}
            icon={<SpeedIcon />}
            loading={loading}
            subtitle={
              <Chip 
                label={compressor?.motor?.status || 'Unknown'} 
                color={getStatusColor(compressor?.motor?.status)}
                size="small"
              />
            }
            tooltip="Percentage of time compressor was running"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Compressor Performance
            </Typography>
            <Box mt={2}>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="text.secondary">Oil Temperature</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {compressor?.temperature?.avg_oil_temp_f?.toFixed(1) || 0}°F
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="text.secondary">Filter Differential Pressure</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1" fontWeight={600}>
                    {compressor?.maintenance?.filter_diff_pressure_psi?.toFixed(2) || 0} PSI
                  </Typography>
                  <Chip 
                    label={compressor?.maintenance?.filter_status || 'Unknown'} 
                    color={getStatusColor(compressor?.maintenance?.filter_status)}
                    size="small"
                  />
                </Box>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="text.secondary">Efficiency Score</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {compressor?.efficiency?.toFixed(1) || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Maintenance Indicators
            </Typography>
            <Box mt={2}>
              <Box mb={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Oil Filter Status
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box 
                    sx={{ 
                      width: '100%', 
                      height: 8, 
                      bgcolor: 'grey.200', 
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <Box 
                      sx={{ 
                        width: `${Math.min((compressor?.maintenance?.filter_diff_pressure_psi || 0) / 15 * 100, 100)}%`,
                        height: '100%',
                        bgcolor: compressor?.maintenance?.filter_status === 'good' ? 'success.main' : 'warning.main',
                        transition: 'width 0.3s'
                      }}
                    />
                  </Box>
                  <Typography variant="caption">
                    {((compressor?.maintenance?.filter_diff_pressure_psi || 0) / 15 * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Replace filter at 15 PSI differential
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Temperature Status
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box 
                    sx={{ 
                      width: '100%', 
                      height: 8, 
                      bgcolor: 'grey.200', 
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <Box 
                      sx={{ 
                        width: `${Math.min((compressor?.temperature?.avg_discharge_f || 0) / 250 * 100, 100)}%`,
                        height: '100%',
                        bgcolor: (compressor?.temperature?.avg_discharge_f || 0) > 220 ? 'error.main' : 'success.main',
                        transition: 'width 0.3s'
                      }}
                    />
                  </Box>
                  <Typography variant="caption">
                    {((compressor?.temperature?.avg_discharge_f || 0) / 250 * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Max safe temperature: 250°F
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Blower Section */}
      <Typography variant="h5" gutterBottom fontWeight={600} mb={2} mt={4}>
        Blower System
      </Typography>
      
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="VFD Speed"
            value={blower?.vfd_speed_hz?.toFixed(1) || '0'}
            unit="Hz"
            icon={<SpeedIcon />}
            loading={loading}
            tooltip="Variable frequency drive speed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Discharge Pressure"
            value={blower?.discharge_pressure_psi?.toFixed(1) || '0'}
            unit="PSI"
            icon={<CompressIcon />}
            loading={loading}
            tooltip="Blower discharge pressure"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Suction Temperature"
            value={blower?.suction_temp_f?.toFixed(1) || '0'}
            unit="°F"
            icon={<ThermostatIcon />}
            loading={loading}
            tooltip="Blower suction temperature"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Uptime"
            value={`${blower?.uptime_percentage?.toFixed(1) || 0}%`}
            icon={<PrecisionManufacturingIcon />}
            loading={loading}
            subtitle={
              <Chip 
                label={blower?.status || 'Unknown'} 
                color={getStatusColor(blower?.status)}
                size="small"
              />
            }
            tooltip="Percentage of time blower was running"
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Blower Performance
        </Typography>
        <Box mt={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Suction Pressure</Typography>
              <Typography variant="h5" fontWeight={600}>
                {blower?.suction_pressure_psi?.toFixed(2) || 0} PSI
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Pressure Differential</Typography>
              <Typography variant="h5" fontWeight={600}>
                {((blower?.discharge_pressure_psi || 0) - (blower?.suction_pressure_psi || 0)).toFixed(2)} PSI
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Operating Status</Typography>
              <Chip 
                label={blower?.status || 'Unknown'} 
                color={getStatusColor(blower?.status)}
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </DashboardLayout>
  );
};

export default EquipmentDashboard;
