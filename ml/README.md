# Smart Home ML Prediction System

This module implements a Decision Tree-based prediction system for temperature and humidity in the Smart Home application.

## Overview

The prediction system uses Decision Tree Regression models to forecast temperature and humidity values for the next 5 minutes based on current and historical sensor data. If the predicted temperature exceeds the threshold (30°C), the system can automatically activate cooling devices (fans).

## Features

- Data collection from PostgreSQL database
- Data preprocessing (handling missing values, removing duplicates, feature engineering)
- Decision Tree model training with optimized hyperparameters
- Real-time predictions for temperature and humidity
- Automatic fan activation based on temperature predictions
- Integration with the Node.js backend via a service interface

## Directory Structure

```
ml/
├── data/                  # Directory for storing data files
│   └── sensor_data_preprocessed.csv
├── models/                # Directory for storing trained models
│   ├── temperature_model.pkl
│   ├── humidity_model.pkl
│   ├── temp_scaler.pkl
│   └── humid_scaler.pkl
├── logs/                  # Directory for log files
├── decision_tree_model.py # Script for training the models
├── prediction_service.py  # Script for making predictions
├── requirements.txt       # Python dependencies
├── setup.sh               # Setup script
└── README.md              # This file
```

## Installation

1. Ensure you have Python 3.6+ installed
2. Run the setup script to create a virtual environment and install dependencies:

```bash
./setup.sh
```

## Usage

### Training the Models

To train the prediction models, run:

```bash
source venv/bin/activate
python decision_tree_model.py
```

The script will:
1. Connect to the PostgreSQL database
2. Fetch temperature and humidity data
3. Preprocess the data
4. Train separate models for temperature and humidity
5. Save the trained models to the `models/` directory

### Making Predictions

The prediction service is used by the Node.js backend. It takes current sensor values as input and returns predicted values.

## Model Details

### Input Features

- Time of day (night, morning, afternoon, evening)
- Current temperature
- Previous temperature
- Current humidity
- Previous humidity

### Output

- Predicted temperature for the next 5 minutes
- Predicted humidity for the next 5 minutes
- Prediction intervals
- Recommendation for fan activation

### Hyperparameters

The models use the following hyperparameters, optimized via grid search:

- `max_depth`: 8
- `min_samples_leaf`: 20

### Performance Metrics

The models are evaluated using:

- Mean Squared Error (MSE)
- Mean Absolute Error (MAE)
- R-squared (R²)

## Integration with Node.js Backend

The models are integrated with the Node.js backend via the `mlPredictionService.js` service. The service:

1. Calls the Python prediction script
2. Caches sensor values for prediction
3. Manages model training
4. Activates devices based on predictions

## Frontend Integration

The predictions are displayed on the dashboard using the `PredictionWidget` React component. 