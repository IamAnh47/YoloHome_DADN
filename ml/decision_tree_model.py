#!/usr/bin/env python3
import os
import sys
import pandas as pd
import numpy as np
import psycopg2
import pickle
from sklearn.tree import DecisionTreeRegressor
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import datetime
import logging
import warnings
import io

warnings.filterwarnings('ignore')

# Create directories first - before logging setup
os.makedirs(os.path.join(os.path.dirname(__file__), 'logs'), exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(__file__), 'models'), exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)

# Configure logging with proper encoding
handlers = [logging.StreamHandler()]

# Create a file handler with UTF-8 encoding
log_file = os.path.join(os.path.dirname(__file__), 'logs', 'model_training.log')
file_handler = logging.FileHandler(log_file, encoding='utf-8')
handlers.append(file_handler)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=handlers
)

logger = logging.getLogger('decision_tree_model')

# Database connection parameters - read from environment or use defaults
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'smarthome')

def connect_to_db():
    """Connect to the PostgreSQL database and return connection"""
    try:
        conn = psycopg2.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME
        )
        logger.info("Connected to PostgreSQL database successfully")
        return conn
    except Exception as e:
        logger.error(f"Error connecting to PostgreSQL database: {e}")
        sys.exit(1)

def get_sensor_data(conn):
    """Get temperature and humidity data from the database"""
    try:
        cur = conn.cursor()
        
        # Get temperature and humidity sensor IDs
        cur.execute("SELECT sensor_id FROM sensor WHERE sensor_type = 'temperature' LIMIT 1")
        temp_sensor_id = cur.fetchone()[0]
        
        cur.execute("SELECT sensor_id FROM sensor WHERE sensor_type = 'humidity' LIMIT 1")
        humid_sensor_id = cur.fetchone()[0]
        
        # Get temperature data
        cur.execute("""
            SELECT svalue, recorded_time 
            FROM sensor_data 
            WHERE sensor_id = %s 
            ORDER BY recorded_time
        """, (temp_sensor_id,))
        temp_data = cur.fetchall()
        
        # Get humidity data
        cur.execute("""
            SELECT svalue, recorded_time 
            FROM sensor_data 
            WHERE sensor_id = %s 
            ORDER BY recorded_time
        """, (humid_sensor_id,))
        humid_data = cur.fetchall()
        
        cur.close()
        
        # Convert to DataFrame
        temp_df = pd.DataFrame(temp_data, columns=['temperature', 'timestamp'])
        humid_df = pd.DataFrame(humid_data, columns=['humidity', 'timestamp'])
        
        # Merge data based on closest timestamp
        temp_df['timestamp'] = pd.to_datetime(temp_df['timestamp'])
        humid_df['timestamp'] = pd.to_datetime(humid_df['timestamp'])
        
        # Sort by timestamp
        temp_df = temp_df.sort_values('timestamp')
        humid_df = humid_df.sort_values('timestamp')
        
        # Remove duplicates
        temp_df = temp_df.drop_duplicates(subset=['timestamp'])
        humid_df = humid_df.drop_duplicates(subset=['timestamp'])
        
        # Set timestamp as index
        temp_df.set_index('timestamp', inplace=True)
        humid_df.set_index('timestamp', inplace=True)
        
        # Resample to regular intervals (e.g., 5-minute intervals)
        temp_df = temp_df.resample('5min').mean()
        humid_df = humid_df.resample('5min').mean()
        
        # Merge temperature and humidity data
        merged_df = pd.merge(temp_df, humid_df, left_index=True, right_index=True, how='outer')
        
        # Interpolate missing values
        merged_df = merged_df.interpolate(method='linear')
        
        # Remove consecutive duplicates
        duplicate_mask = merged_df.duplicated(subset=['temperature', 'humidity'], keep='first')
        grouped_duplicates = duplicate_mask.groupby((~duplicate_mask).cumsum()).cumsum()
        merged_df = merged_df[grouped_duplicates < 3]
        
        # Reset index to convert timestamp back to a column
        merged_df.reset_index(inplace=True)
        
        # Check if we have enough data
        if len(merged_df) < 10:
            logger.warning("Not enough data for model training. Need at least 10 records.")
            return None
            
        return merged_df
    except Exception as e:
        logger.error(f"Error fetching sensor data: {e}")
        return None

def preprocess_data(df):
    """Preprocess the data for model training"""
    try:
        # Extract time features
        df['hour'] = df['timestamp'].dt.hour
        
        # Create time of day feature (0: night, 1: morning, 2: afternoon, 3: evening)
        conditions = [
            (df['hour'] >= 0) & (df['hour'] < 6),    # Night: 0-6
            (df['hour'] >= 6) & (df['hour'] < 12),   # Morning: 6-12
            (df['hour'] >= 12) & (df['hour'] < 18),  # Afternoon: 12-18
            (df['hour'] >= 18) & (df['hour'] < 24),  # Evening: 18-24
        ]
        values = [0, 1, 2, 3]
        df['time_of_day'] = np.select(conditions, values)
        
        # Create lag features
        for lag in range(1, 3):  # Create lag 1 and lag 2
            df[f'temp_lag_{lag}'] = df['temperature'].shift(lag)
            df[f'humid_lag_{lag}'] = df['humidity'].shift(lag)
        
        # Drop rows with NaN (from the lag operation)
        df = df.dropna()
        
        # Save the preprocessed data to CSV
        data_path = os.path.join(os.path.dirname(__file__), 'data', 'sensor_data_preprocessed.csv')
        df.to_csv(data_path, index=False)
        logger.info(f"Preprocessed data saved to {data_path}")
        
        return df
    except Exception as e:
        logger.error(f"Error preprocessing data: {e}")
        return None

def train_temperature_model(df):
    """Train the Decision Tree model for temperature prediction"""
    try:
        # Features: time of day, lag features
        X = df[['time_of_day', 'temp_lag_1', 'temp_lag_2', 'humid_lag_1', 'humid_lag_2']]
        y = df['temperature']
        
        # Scale the features
        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Save the scaler
        scaler_path = os.path.join(os.path.dirname(__file__), 'models', 'temp_scaler.pkl')
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        
        # Grid search for hyperparameter tuning
        param_grid = {
            'max_depth': [4, 6, 8, 10],
            'min_samples_leaf': [5, 10, 20, 30]
        }
        
        grid_search = GridSearchCV(
            DecisionTreeRegressor(random_state=42),
            param_grid=param_grid,
            cv=5,
            scoring='neg_mean_squared_error'
        )
        
        grid_search.fit(X_train, y_train)
        
        # Get the best model
        best_model = grid_search.best_estimator_
        
        # Evaluate the model
        y_pred = best_model.predict(X_test)
        
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"Temperature Model - Best Parameters: {grid_search.best_params_}")
        logger.info(f"Temperature Model Evaluation - MSE: {mse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}")
        
        # Save the model
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'temperature_model.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump(best_model, f)
        
        logger.info(f"Temperature model saved to {model_path}")
        
        return best_model, scaler
    except Exception as e:
        logger.error(f"Error training temperature model: {e}")
        return None, None

def train_humidity_model(df):
    """Train the Decision Tree model for humidity prediction"""
    try:
        # Features: time of day, lag features
        X = df[['time_of_day', 'temp_lag_1', 'temp_lag_2', 'humid_lag_1', 'humid_lag_2']]
        y = df['humidity']
        
        # Scale the features
        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Save the scaler
        scaler_path = os.path.join(os.path.dirname(__file__), 'models', 'humid_scaler.pkl')
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        
        # Grid search for hyperparameter tuning
        param_grid = {
            'max_depth': [4, 6, 8, 10],
            'min_samples_leaf': [5, 10, 20, 30]
        }
        
        grid_search = GridSearchCV(
            DecisionTreeRegressor(random_state=42),
            param_grid=param_grid,
            cv=5,
            scoring='neg_mean_squared_error'
        )
        
        grid_search.fit(X_train, y_train)
        
        # Get the best model
        best_model = grid_search.best_estimator_
        
        # Evaluate the model
        y_pred = best_model.predict(X_test)
        
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"Humidity Model - Best Parameters: {grid_search.best_params_}")
        logger.info(f"Humidity Model Evaluation - MSE: {mse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}")
        
        # Save the model
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'humidity_model.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump(best_model, f)
        
        logger.info(f"Humidity model saved to {model_path}")
        
        return best_model, scaler
    except Exception as e:
        logger.error(f"Error training humidity model: {e}")
        return None, None

def main():
    """Main function to run the entire model training pipeline"""
    try:
        # Connect to the database
        conn = connect_to_db()
        
        # Get sensor data
        df = get_sensor_data(conn)
        conn.close()
        
        if df is None or df.empty:
            logger.error("Could not retrieve sensor data or dataset is empty")
            return
        
        # Preprocess the data
        df = preprocess_data(df)
        
        if df is None or df.empty:
            logger.error("Data preprocessing failed")
            return
        
        # Train temperature model
        temp_model, temp_scaler = train_temperature_model(df)
        
        # Train humidity model
        humid_model, humid_scaler = train_humidity_model(df)
        
        logger.info("Model training completed successfully")
    except Exception as e:
        logger.error(f"Error in main function: {e}")

if __name__ == "__main__":
    main() 