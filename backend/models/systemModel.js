const db = require('../config/db');

// Get AI mode status
exports.getAIMode = async () => {
  try {
    // Try to get the current setting
    const query = 'SELECT status FROM ai_mode LIMIT 1';
    const result = await db.query(query);
    
    // If record exists, return it
    if (result.rows.length > 0) {
      return result.rows[0].status;
    }
    
    // Create default setting if not exists
    await db.query('INSERT INTO ai_mode (status) VALUES ($1)', [false]);
    return false;
  } catch (error) {
    console.error('Error getting AI mode:', error);
    return false; // Default to off in case of error
  }
};

// Update AI mode status
exports.updateAIMode = async (status) => {
  try {
    // First check if the record exists
    const checkQuery = 'SELECT id FROM ai_mode LIMIT 1';
    const checkResult = await db.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      // Update existing record
      const updateQuery = 'UPDATE ai_mode SET status = $1 WHERE id = $2';
      await db.query(updateQuery, [status, checkResult.rows[0].id]);
    } else {
      // Create new record
      const insertQuery = 'INSERT INTO ai_mode (status) VALUES ($1)';
      await db.query(insertQuery, [status]);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating AI mode:', error);
    return false;
  }
}; 