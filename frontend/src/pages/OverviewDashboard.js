import React, { useState, useEffect, useCallback } from 'react';
import { Grid, Paper, Typography, Box, Alert } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SpeedIcon from '@mui/icons-material/Speed';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import BoltIcon from '@mui/icons-material/Bolt';
import KPICard from '../components/common/KPICard';
import DashboardLayout from '../components/common/DashboardLayout';
import useDashboardFilters from '../hooks/useDashboardFilters';
import { getSystemSummary, getSystemTrends } from '../api/biogasApi';

const OverviewDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { filters, handleHoursChange } = useDashboardFilters();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { hours: filters.hours };
      const [summaryRes, trendsRes] = await Promise.all([
        getSystemSummary(params),
        getSystemTrends(params)
      ]);

      setSummary(summaryRes.data.data);
      setTrends(trendsRes.data.data);
    } catch (err) {
      console.error('Error loading overview data:', err);
      setError('Failed to load dashboard data. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [filters.hours]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DashboardLayout
      title="System Overview"
      loading={loading}
      error={error}
      onRefresh={loadData}
      filters={filters}
      onHoursChange={handleHoursChange}
    >
      {/* KPI Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="CH4 Production"
            value={`${summary?.gas_production?.avg_ch4_percent || 0}%`}
            icon={<LocalFireDepartmentIcon />}
            loading={loading}
            tooltip="Average methane concentration. Target: >70%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Gas Flow Rate"
            value={summary?.gas_production?.avg_flow_rate?.toFixed(1) || '0'}
            unit="SCFM"
            icon={<SpeedIcon />}
            loading={loading}
            tooltip="Standard cubic feet per minute"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="System Health"
            value={`${summary?.system_health?.health_score?.toFixed(0) || 0}%`}
            icon={<HealthAndSafetyIcon />}
            loading={loading}
            subtitle={`Uptime: ${summary?.system_health?.uptime_percentage?.toFixed(1) || 0}%`}
            tooltip="Overall system health score based on equipment status and sensor readings"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Energy Production"
            value={summary?.gas_production?.total_energy?.toFixed(0) || '0'}
            unit="SCF"
            icon={<BoltIcon />}
            loading={loading}
            tooltip="Total standard cubic feet of gas produced"
          />
        </Grid>
      </Grid>

      {/* Trends Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Gas Production Trends
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Methane and CO2 concentration over time
        </Typography>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="timestamp" 
              tick={{ fill: '#666', fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#666', fontSize: 12 }}
              label={{ value: 'Concentration (%)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#666', fontSize: 12 }}
              label={{ value: 'Flow (SCFM)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              labelFormatter={(value) => new Date(value).toLocaleString()}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ch4_percent"
              stroke="#2e7d32"
              strokeWidth={2}
              name="CH4 (%)"
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="co2_percent"
              stroke="#d32f2f"
              strokeWidth={2}
              name="CO2 (%)"
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="flow_rate"
              stroke="#1976d2"
              strokeWidth={2}
              name="Flow Rate"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* System Health Chart */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          System Health & Uptime
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Overall system health score and uptime percentage
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="timestamp" 
              tick={{ fill: '#666', fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis 
              tick={{ fill: '#666', fontSize: 12 }}
              domain={[0, 100]}
              label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              labelFormatter={(value) => new Date(value).toLocaleString()}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="health_score"
              stroke="#2e7d32"
              strokeWidth={2}
              name="Health Score"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="uptime_pct"
              stroke="#1976d2"
              strokeWidth={2}
              name="Uptime %"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* Data Info */}
      {summary && (
        <Box mt={2}>
          <Alert severity="info">
            Showing data from {new Date(summary.time_range?.start).toLocaleString()} to{' '}
            {new Date(summary.time_range?.end).toLocaleString()} ({summary.data_points?.toLocaleString()} data points)
          </Alert>
        </Box>
      )}
    </DashboardLayout>
  );
};

export default OverviewDashboard;
