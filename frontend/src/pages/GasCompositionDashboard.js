import React, { useState, useEffect, useCallback } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ScienceIcon from '@mui/icons-material/Science';
import Co2Icon from '@mui/icons-material/Co2';
import AirIcon from '@mui/icons-material/Air';
import KPICard from '../components/common/KPICard';
import DashboardLayout from '../components/common/DashboardLayout';
import useDashboardFilters from '../hooks/useDashboardFilters';
import { getGasComposition, getGasTrends } from '../api/biogasApi';

const GasCompositionDashboard = () => {
  const [composition, setComposition] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { filters, handleHoursChange } = useDashboardFilters();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { hours: filters.hours };
      const [compositionRes, trendsRes] = await Promise.all([
        getGasComposition(params),
        getGasTrends(params)
      ]);

      setComposition(compositionRes.data.data);
      setTrends(trendsRes.data.data);
    } catch (err) {
      console.error('Error loading gas composition data:', err);
      setError('Failed to load gas composition data.');
    } finally {
      setLoading(false);
    }
  }, [filters.hours]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pieData = composition ? [
    { name: 'CH4 (Methane)', value: composition.methane?.average || 0, color: '#2e7d32' },
    { name: 'CO2 (Carbon Dioxide)', value: composition.carbon_dioxide?.average || 0, color: '#d32f2f' },
    { name: 'N2 (Nitrogen)', value: composition.nitrogen?.average || 0, color: '#1976d2' },
    { name: 'O2 (Oxygen)', value: composition.oxygen?.average || 0, color: '#f57c00' },
  ] : [];

  return (
    <DashboardLayout
      title="Gas Composition Analysis"
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
            title="Methane (CH4)"
            value={`${composition?.methane?.average?.toFixed(2) || 0}%`}
            icon={<ScienceIcon />}
            loading={loading}
            subtitle={`Min: ${composition?.methane?.min?.toFixed(2) || 0}% | Max: ${composition?.methane?.max?.toFixed(2) || 0}%`}
            tooltip="Primary energy component. Target: >70%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Carbon Dioxide (CO2)"
            value={`${composition?.carbon_dioxide?.average?.toFixed(2) || 0}%`}
            icon={<Co2Icon />}
            loading={loading}
            tooltip="Should be minimized for higher energy content"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Nitrogen (N2)"
            value={`${composition?.nitrogen?.average?.toFixed(2) || 0}%`}
            icon={<AirIcon />}
            loading={loading}
            tooltip="Inert gas, indicates air infiltration if high"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Gas Quality Score"
            value={composition?.quality_score?.toFixed(0) || '0'}
            unit="/100"
            icon={<ScienceIcon />}
            loading={loading}
            tooltip="Weighted score based on CH4 content and impurities"
          />
        </Grid>
      </Grid>

      {/* Composition Pie Chart */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Average Gas Composition
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Breakdown of gas components
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Gas Quality Metrics
            </Typography>
            <Box mt={3}>
              <Box mb={3}>
                <Typography variant="body2" color="text.secondary">Hydrogen Sulfide (H2S)</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {composition?.hydrogen_sulfide?.average?.toFixed(2) || 0} ppm
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Target: &lt;10 ppm (corrosive if high)
                </Typography>
              </Box>
              <Box mb={3}>
                <Typography variant="body2" color="text.secondary">Oxygen (O2)</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {composition?.oxygen?.average?.toFixed(2) || 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Target: &lt;1% (indicates air leaks if high)
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Energy Content</Typography>
                <Typography variant="h5" fontWeight={600}>
                  ~{((composition?.methane?.average || 0) * 10).toFixed(0)} BTU/SCF
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Based on CH4 concentration (1000 BTU/SCF per % CH4)
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Trends Chart */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Gas Composition Trends
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          CH4 and CO2 levels over time
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
              tick={{ fill: '#666', fontSize: 12 }}
              domain={[0, 100]}
              label={{ value: 'Concentration (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              labelFormatter={(value) => new Date(value).toLocaleString()}
              formatter={(value) => `${value.toFixed(2)}%`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="ch4"
              stroke="#2e7d32"
              strokeWidth={2}
              name="Methane (CH4)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="co2"
              stroke="#d32f2f"
              strokeWidth={2}
              name="Carbon Dioxide (CO2)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </DashboardLayout>
  );
};

export default GasCompositionDashboard;
