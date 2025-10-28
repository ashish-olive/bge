import React from 'react';
import { Card, CardContent, Typography, Box, Tooltip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const KPICard = ({ title, value, change, icon, loading, subtitle, tooltip, unit }) => {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
              {tooltip && (
                <Tooltip title={tooltip} arrow placement="top">
                  <InfoOutlinedIcon 
                    sx={{ 
                      fontSize: 16, 
                      ml: 0.5, 
                      verticalAlign: 'middle',
                      color: 'text.secondary',
                      cursor: 'help'
                    }} 
                  />
                </Tooltip>
              )}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: 'primary.light',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography variant="h4" component="div" fontWeight="bold" gutterBottom>
          {loading ? '...' : value}
          {unit && <Typography component="span" variant="h6" color="text.secondary" ml={1}>{unit}</Typography>}
        </Typography>

        {subtitle && (
          <Typography variant="body2" color="text.secondary" mb={1}>
            {subtitle}
          </Typography>
        )}

        {change !== null && change !== undefined && !loading && (
          <Box display="flex" alignItems="center" mt={1}>
            {isPositive && <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20, mr: 0.5 }} />}
            {isNegative && <TrendingDownIcon sx={{ color: 'error.main', fontSize: 20, mr: 0.5 }} />}
            <Typography
              variant="body2"
              sx={{
                color: isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.secondary',
                fontWeight: 500,
              }}
            >
              {isPositive && '+'}{change?.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary" ml={0.5}>
              vs previous period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default KPICard;
