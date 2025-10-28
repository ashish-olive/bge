import React from 'react';
import { Container, Box, Typography, Paper, Alert, CircularProgress, Button, ButtonGroup } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

const DashboardLayout = ({ 
  title, 
  children, 
  loading, 
  error, 
  onRefresh,
  filters,
  onHoursChange 
}) => {
  const timeRangeOptions = [
    { label: '1H', hours: 1 },
    { label: '6H', hours: 6 },
    { label: '24H', hours: 24 },
    { label: '7D', hours: 168 },
    { label: '30D', hours: 720 },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {title}
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          {onHoursChange && (
            <ButtonGroup variant="outlined" size="small">
              {timeRangeOptions.map((option) => (
                <Button
                  key={option.hours}
                  onClick={() => onHoursChange(option.hours)}
                  variant={filters?.hours === option.hours ? 'contained' : 'outlined'}
                >
                  {option.label}
                </Button>
              ))}
            </ButtonGroup>
          )}
          
          {onRefresh && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : (
        <Box>{children}</Box>
      )}
    </Container>
  );
};

export default DashboardLayout;
