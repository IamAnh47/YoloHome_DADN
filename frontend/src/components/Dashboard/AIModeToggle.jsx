import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  FormControlLabel, 
  Switch, 
  CircularProgress,
  Tooltip,
  IconButton 
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SystemController from '../../controllers/SystemController';

const AIModeToggle = () => {
  const [aiModeEnabled, setAIModeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Load initial state
  useEffect(() => {
    const getAIMode = async () => {
      try {
        setLoading(true);
        const status = await SystemController.getAIMode();
        setAIModeEnabled(status);
      } catch (error) {
        console.error('Error loading AI mode status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getAIMode();
  }, []);
  
  // Handle toggle change
  const handleToggleChange = async (event) => {
    const newStatus = event.target.checked;
    
    try {
      setUpdating(true);
      const success = await SystemController.updateAIMode(newStatus);
      
      if (success) {
        setAIModeEnabled(newStatus);
      }
    } catch (error) {
      console.error('Error updating AI mode:', error);
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div">
            <SmartToyIcon sx={{ mr: 1, verticalAlign: 'text-bottom' }} />
            Chế độ AI
            <Tooltip title="Khi bật chế độ AI, hệ thống sẽ tự động kích hoạt quạt khi nhiệt độ vượt quá 30°C">
              <IconButton size="small" sx={{ ml: 0.5 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <FormControlLabel
              control={
                <Switch
                  checked={aiModeEnabled}
                  onChange={handleToggleChange}
                  color="primary"
                  disabled={updating}
                />
              }
              label={aiModeEnabled ? "Đang bật" : "Đang tắt"}
            />
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" mt={1}>
          {aiModeEnabled 
            ? "Hệ thống sẽ tự động bật quạt khi nhiệt độ vượt quá 30°C" 
            : "Bật chế độ AI để tự động điều khiển quạt dựa trên nhiệt độ"}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AIModeToggle; 