#!/usr/bin/env python3
import os
import sys
import pickle
import numpy as np
import pandas as pd
import json
import logging
from datetime import datetime, timedelta
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'logs', 'prediction.log'))
    ]
)

logger = logging.getLogger('prediction_service')

# Create logs directory if it doesn't exist
os.makedirs(os.path.join(os.path.dirname(__file__), 'logs'), exist_ok=True)

def load_models():
    """Load the trained models and scalers"""
    try:
        models_dir = os.path.join(os.path.dirname(__file__), 'models')
        
        # Load temperature model and scaler
        with open(os.path.join(models_dir, 'temperature_model.pkl'), 'rb') as f:
            temp_model = pickle.load(f)
        
        with open(os.path.join(models_dir, 'temp_scaler.pkl'), 'rb') as f:
            temp_scaler = pickle.load(f)
        
        # Load humidity model and scaler
        with open(os.path.join(models_dir, 'humidity_model.pkl'), 'rb') as f:
            humid_model = pickle.load(f)
        
        with open(os.path.join(models_dir, 'humid_scaler.pkl'), 'rb') as f:
            humid_scaler = pickle.load(f)
        
        logger.info("Models loaded successfully")
        
        return temp_model, temp_scaler, humid_model, humid_scaler
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        return None, None, None, None

def predict_values(temp_model, temp_scaler, humid_model, humid_scaler, 
                   curr_temp, curr_humid, prev_temp, prev_humid):
    """
    Make predictions for temperature and humidity
    
    Args:
        temp_model: Trained temperature model
        temp_scaler: Scaler used for temperature model
        humid_model: Trained humidity model
        humid_scaler: Scaler used for humidity model
        curr_temp: Current temperature
        curr_humid: Current humidity
        prev_temp: Previous temperature
        prev_humid: Previous humidity
    
    Returns:
        Predicted temperature and humidity for the next 5 minutes
    """
    try:
        # Get current hour
        now = datetime.now()
        hour = now.hour
        
        # Determine time of day
        if 0 <= hour < 6:
            time_of_day = 0  # Night
        elif 6 <= hour < 12:
            time_of_day = 1  # Morning
        elif 12 <= hour < 18:
            time_of_day = 2  # Afternoon
        else:
            time_of_day = 3  # Evening
        
        # Create feature vector
        features = np.array([[time_of_day, curr_temp, prev_temp, curr_humid, prev_humid]])
        
        # Scale features
        scaled_temp_features = temp_scaler.transform(features)
        scaled_humid_features = humid_scaler.transform(features)
        
        # Make predictions
        pred_temp = temp_model.predict(scaled_temp_features)[0]
        pred_humid = humid_model.predict(scaled_humid_features)[0]
        
        # Create prediction intervals
        # For a decision tree, the prediction intervals are not straightforward
        # Using a simple approach with a percentage variation
        temp_interval = 0.5  # ±0.5°C
        humid_interval = 2.0  # ±2%
        
        temp_lower = max(0, pred_temp - temp_interval)
        temp_upper = pred_temp + temp_interval
        
        humid_lower = max(0, pred_humid - humid_interval)
        humid_upper = min(100, pred_humid + humid_interval)
        
        # Check threshold for fan activation
        temp_threshold = 30.0
        should_activate_fan = pred_temp > temp_threshold
        
        return {
            'prediction_time': now.isoformat(),
            'temperature': {
                'current': curr_temp,
                'predicted': pred_temp,
                'lower_bound': temp_lower,
                'upper_bound': temp_upper,
                'exceeds_threshold': pred_temp > temp_threshold,
                'threshold': temp_threshold
            },
            'humidity': {
                'current': curr_humid,
                'predicted': pred_humid,
                'lower_bound': humid_lower,
                'upper_bound': humid_upper
            },
            'time_horizon': '5_minutes',
            'activate_fan': should_activate_fan
        }
    except Exception as e:
        logger.error(f"Error making predictions: {e}")
        return None

def read_input():
    """Read input data from stdin in JSON format"""
    try:
        input_data = json.loads(sys.stdin.read())
        return input_data
    except Exception as e:
        logger.error(f"Error reading input data: {e}")
        return None

def write_output(data):
    """Write output data to stdout in JSON format"""
    try:
        sys.stdout.write(json.dumps(data))
        sys.stdout.flush()
    except Exception as e:
        logger.error(f"Error writing output data: {e}")

def main():
    """Main function to run the prediction service"""
    try:
        # Load models
        temp_model, temp_scaler, humid_model, humid_scaler = load_models()
        
        if not all([temp_model, temp_scaler, humid_model, humid_scaler]):
            logger.error("Failed to load models")
            sys.exit(1)
        
        # Read input data
        input_data = read_input()
        
        if not input_data:
            logger.error("No input data provided")
            sys.exit(1)
        
        # Extract sensor values
        current_temp = input_data.get('current_temperature')
        previous_temp = input_data.get('previous_temperature')
        current_humid = input_data.get('current_humidity')
        previous_humid = input_data.get('previous_humidity')
        
        # Validate input data
        if any(x is None for x in [current_temp, previous_temp, current_humid, previous_humid]):
            logger.error("Missing required input data")
            sys.exit(1)
        
        # Make predictions
        predictions = predict_values(
            temp_model, temp_scaler, humid_model, humid_scaler,
            current_temp, current_humid, previous_temp, previous_humid
        )
        
        # Write output
        write_output(predictions)
        
    except Exception as e:
        logger.error(f"Error in main function: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 