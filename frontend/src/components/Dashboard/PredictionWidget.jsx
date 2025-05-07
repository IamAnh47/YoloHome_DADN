import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, Typography, Box, CircularProgress, Button, Alert, LinearProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import UpdateIcon from '@mui/icons-material/Update';
import ScienceIcon from '@mui/icons-material/Science';
import SystemController from '../../controllers/SystemController';

const PredictionWidget = () => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showTrainButton, setShowTrainButton] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainStatus, setTrainStatus] = useState(null);
  const [aiModeEnabled, setAIModeEnabled] = useState(null);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/sensors/predictions');
      
      if (response.data.success) {
        setPredictions(response.data.data);
        setLastUpdated(new Date());
      } else {
        setError(response.data.message || 'Failed to fetch predictions');
        setShowTrainButton(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch predictions');
      setShowTrainButton(true);
    } finally {
      setLoading(false);
    }
  };
  
  const trainModels = async () => {
    setTraining(true);
    setTrainStatus('Training models, this may take a few minutes...');
    
    try {
      const response = await axios.post('/api/sensors/train-models');
      
      if (response.data.success) {
        setTrainStatus('Models trained successfully! Fetching predictions...');
        setTimeout(() => {
          fetchPredictions();
          setTrainStatus(null);
        }, 2000);
      } else {
        setTrainStatus(`Training failed: ${response.data.message}`);
      }
    } catch (err) {
      setTrainStatus(`Training error: ${err.response?.data?.message || err.message}`);
    } finally {
      setTraining(false);
    }
  };
  
  useEffect(() => {
    fetchPredictions();
    
    // Fetch predictions every 5 minutes
    const interval = setInterval(fetchPredictions, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const getAIMode = async () => {
      try {
        const status = await SystemController.getAIMode();
        setAIModeEnabled(status);
      } catch (error) {
        console.error('Error fetching AI mode:', error);
      }
    };
    
    getAIMode();
  }, []);
  
  // Format prediction data for chart
  const getChartData = () => {
    if (!predictions) return [];
    
    const now = new Date();
    
    // Create data points for current and predicted values
    return [
      {
        name: 'Current',
        temperature: predictions.temperature.current,
        humidity: predictions.humidity.current,
        time: now.toLocaleTimeString()
      },
      {
        name: 'In 5 min',
        temperature: predictions.temperature.predicted,
        tempLower: predictions.temperature.lower_bound,
        tempUpper: predictions.temperature.upper_bound,
        humidity: predictions.humidity.predicted,
        humidLower: predictions.humidity.lower_bound,
        humidUpper: predictions.humidity.upper_bound,
        time: new Date(now.getTime() + 5 * 60 * 1000).toLocaleTimeString()
      }
    ];
  };
  
  // Render loading state
  if (loading && !predictions) {
    return (
      <Card sx={{ minHeight: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }
  
  // Render error state
  if (error && !predictions) {
    return (
      <Card sx={{ minHeight: 300 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Temperature & Humidity Predictions
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          {showTrainButton && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<ScienceIcon />}
                onClick={trainModels}
                disabled={training}
              >
                Train Prediction Models
              </Button>
            </Box>
          )}
          {trainStatus && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {trainStatus}
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Render prediction results
  return (
    <Card sx={{ minHeight: 300 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">
            <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Temperature & Humidity Predictions
          </Typography>
          <Button 
            size="small" 
            startIcon={<UpdateIcon />} 
            onClick={fetchPredictions}
            disabled={loading}
          >
            Update
          </Button>
        </Box>
        
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {predictions && (
          <>
            <Box display="flex" justifyContent="space-between" flexWrap="wrap" mb={2}>
              <Box width={{ xs: '100%', sm: '48%' }} mb={{ xs: 2, sm: 0 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      <ThermostatIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Temperature Prediction (5 min)
                    </Typography>
                    <Typography variant="h5" component="div" mt={1}>
                      {predictions.temperature.predicted.toFixed(1)}°C
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current: {predictions.temperature.current.toFixed(1)}°C
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Range: {predictions.temperature.lower_bound.toFixed(1)} - {predictions.temperature.upper_bound.toFixed(1)}°C
                    </Typography>
                    {predictions.temperature.exceeds_threshold && (
                      <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                        Exceeds threshold ({predictions.temperature.threshold}°C)
                        {aiModeEnabled !== null && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            {aiModeEnabled 
                              ? "Quạt sẽ tự động bật khi nhiệt độ vượt ngưỡng" 
                              : "Bật chế độ AI để tự động kích hoạt quạt"}
                          </Typography>
                        )}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Box>
              
              <Box width={{ xs: '100%', sm: '48%' }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      <WaterDropIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Humidity Prediction (5 min)
                    </Typography>
                    <Typography variant="h5" component="div" mt={1}>
                      {predictions.humidity.predicted.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current: {predictions.humidity.current.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Range: {predictions.humidity.lower_bound.toFixed(1)} - {predictions.humidity.upper_bound.toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
            
            <Box width="100%" height={200}>
              <ResponsiveContainer>
                <LineChart
                  data={getChartData()}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="temp" orientation="left" domain={['auto', 'auto']} />
                  <YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="temp"
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#ff7300" 
                    activeDot={{ r: 8 }} 
                    name="Temperature (°C)"
                  />
                  <Line 
                    yAxisId="humidity"
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#0088fe" 
                    name="Humidity (%)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            
            {lastUpdated && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 1 }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
            )}
          </>
        )}
        
        {trainStatus && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {trainStatus}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictionWidget; 