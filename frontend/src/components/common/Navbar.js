import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Chip
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BuildIcon from '@mui/icons-material/Build';
import TimelineIcon from '@mui/icons-material/Timeline';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { 
      label: 'Overview', 
      path: '/', 
      icon: <DashboardIcon />,
      type: 'static'
    },
    { 
      label: 'Gas Composition', 
      path: '/gas-composition', 
      icon: <ScienceIcon />,
      type: 'static'
    },
    { 
      label: 'Equipment', 
      path: '/equipment', 
      icon: <PrecisionManufacturingIcon />,
      type: 'static'
    },
    { 
      label: 'Anomalies', 
      path: '/anomalies', 
      icon: <WarningAmberIcon />,
      type: 'static'
    },
    { 
      label: 'Maintenance', 
      path: '/maintenance', 
      icon: <BuildIcon />,
      type: 'static'
    },
    { 
      label: 'Forecasting', 
      path: '/forecasting', 
      icon: <TimelineIcon />,
      type: 'ml',
      badge: 'ML'
    },
    { 
      label: 'Predictions', 
      path: '/predictions', 
      icon: <AutoGraphIcon />,
      type: 'ml',
      badge: 'ML'
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const renderNavItems = () => (
    <>
      {navItems.map((item) => (
        <Button
          key={item.path}
          onClick={() => handleNavigation(item.path)}
          sx={{
            color: location.pathname === item.path ? 'white' : 'rgba(255, 255, 255, 0.8)',
            backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            mx: 0.5,
            position: 'relative',
          }}
        >
          {item.label}
          {item.badge && (
            <Chip 
              label={item.badge} 
              size="small" 
              sx={{ 
                ml: 1, 
                height: 18, 
                fontSize: '0.65rem',
                backgroundColor: 'secondary.main',
                color: 'white'
              }} 
            />
          )}
        </Button>
      ))}
    </>
  );

  const renderDrawerItems = () => (
    <List sx={{ width: 250 }}>
      {navItems.map((item) => (
        <ListItem key={item.path} disablePadding>
          <ListItemButton
            onClick={() => handleNavigation(item.path)}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
            {item.badge && (
              <Chip 
                label={item.badge} 
                size="small" 
                color="secondary"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  return (
    <>
      <AppBar position="sticky" elevation={2}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: isMobile ? 1 : 0,
              fontWeight: 700,
              mr: 4,
              cursor: 'pointer'
            }}
            onClick={() => navigate('/')}
          >
            🏭 Biogas Analytics
          </Typography>

          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex' }}>
              {renderNavItems()}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {renderDrawerItems()}
      </Drawer>
    </>
  );
};

export default Navbar;
