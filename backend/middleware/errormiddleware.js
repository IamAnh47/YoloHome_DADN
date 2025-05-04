// Error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error for developers
  console.error('Error:', err.message);

  // Check if error is a Postgres error
  if (err.code && err.code.startsWith('PG')) {
    return res.status(500).json({
      success: false,
      error: 'Database error',
      message: process.env.NODE_ENV === 'production' ? 'Database operation failed' : err.message
    });
  }

  // Default error response
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = errorHandler; 