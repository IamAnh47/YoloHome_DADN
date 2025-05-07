import React, { useState, useEffect } from 'react';
import { FormControlLabel, Switch, Paper, Typography, Box, Tooltip } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SystemController from '../../controllers/SystemController';

const AIModeToggle = () => {
  const [aiModeEnabled, setAIModeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    const loadAIMode = async () => {
      try {
        const status = await SystemController.getAIMode();
        setAIModeEnabled(status);
      } catch (error) {
        console.error('Error loading AI mode status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAIMode();
  }, []);

  // Handle toggle change
  const handleToggleChange = async (event) => {
    const newStatus = event.target.checked;
    setAIModeEnabled(newStatus);
    
    try {
      await SystemController.updateAIMode(newStatus);
    } catch (error) {
      console.error('Error updating AI mode:', error);
      // Revert UI state if update failed
      setAIModeEnabled(!newStatus);
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      <Box display="flex" alignItems="center">
        <SmartToyIcon 
          sx={{ 
            mr: 1.5, 
            color: aiModeEnabled ? 'primary.main' : 'text.secondary',
            fontSize: 28 
          }} 
        />
        <Box>
          <Typography variant="subtitle1" fontWeight={500}>
            Chế độ AI
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {aiModeEnabled 
              ? 'Tự động bật quạt khi nhiệt độ trên 30°C' 
              : 'Điều khiển quạt thủ công'}
          </Typography>
        </Box>
      </Box>
      
      <Tooltip 
        title={aiModeEnabled 
          ? "Tắt chế độ AI để điều khiển quạt thủ công" 
          : "Bật chế độ AI để tự động kích hoạt quạt khi nhiệt độ trên 30°C"}
      >
        <FormControlLabel
          control={
            <Switch
              checked={aiModeEnabled}
              onChange={handleToggleChange}
              color="primary"
              disabled={loading}
            />
          }
          label={aiModeEnabled ? "Bật" : "Tắt"}
          labelPlacement="start"
          sx={{ m: 0 }}
        />
      </Tooltip>
    </Paper>
  );
};

export default AIModeToggle; 