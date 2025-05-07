import React from 'react';
import PredictionWidget from '../Dashboard/PredictionWidget';
import { Box, Typography, Paper } from '@mui/material';

const PredictionsPage = () => {
  return (
    <div className="predictions-page">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Temperature & Humidity Predictions
        </Typography>
        <Typography variant="body1" paragraph>
          This page shows the temperature and humidity predictions for the next 5 minutes based on our ML model. 
          If AI Mode is enabled, the fan will automatically activate when the predicted temperature exceeds 30°C.
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <PredictionWidget />
        </Paper>
      </Box>
    </div>
  );
};

export default PredictionsPage; 