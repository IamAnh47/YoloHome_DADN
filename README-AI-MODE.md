# Smart Home AI Mode Setup

This guide explains how to set up and use the Smart Home AI Mode feature, which enables automatic fan activation when the predicted temperature exceeds 30°C.

## Overview

The AI Mode feature adds:
1. A toggle switch in the Dashboard to enable/disable AI Mode
2. Automatic fan activation based on temperature predictions when AI Mode is enabled
3. Visual indicators of the current AI Mode status

## Setup Instructions

### 1. Database Setup

First, we need to add the AI Mode table to the database:

```bash
# Navigate to the backend directory
cd Smart-House/backend

# Create the migrations directory if it doesn't exist
mkdir -p database/migrations

# Run the migration
node database/runMigration.js add_ai_mode_table.sql
```

### 2. Start the Backend Server

```bash
# Ensure you're in the backend directory
cd Smart-House/backend

# Install dependencies (if not already done)
npm install

# Start the server
npm run dev
```

### 3. Set Up the ML Environment

```bash
# Navigate to the ml directory
cd Smart-House/ml

# Make setup.sh executable
chmod +x setup.sh

# Run the setup script
./setup.sh

# Train the models (first time only)
source venv/bin/activate
python decision_tree_model.py
```

### 4. Start the Frontend Server

```bash
# Navigate to the frontend directory
cd Smart-House/frontend

# Install dependencies (if not already done)
npm install

# Start the development server
npm start
```

## Using AI Mode

1. Navigate to the Dashboard
2. Find the "AI Mode" toggle at the top of the AI Predictions section
3. Toggle the switch to enable automatic fan control

When AI Mode is enabled:
- The system will automatically activate the fan when the predicted temperature exceeds 30°C
- The prediction widget will show a message indicating that the fan will be activated automatically

When AI Mode is disabled:
- The fan will not be activated automatically
- You'll need to control devices manually

## How It Works

1. The system regularly predicts temperature for the next 5 minutes using a Decision Tree model
2. If the predicted temperature exceeds 30°C and AI Mode is enabled, the system activates the fan
3. The prediction is displayed on the dashboard along with the current AI Mode status

## Troubleshooting

- If the AI Mode toggle isn't working, check that the backend server is running
- If automatic fan activation isn't working, verify that:
  - AI Mode is enabled
  - The fan device exists in the system
  - The temperature prediction exceeds 30°C
  - The ML models have been trained

## Technical Details

- The AI Mode setting is stored in the `ai_mode` table in the PostgreSQL database
- The Decision Tree model is trained on historical temperature and humidity data
- The prediction service runs every 5 minutes to update predictions 