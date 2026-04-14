const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error(err);

  // Prisma duplicate key
  if (err.code === 'P2002') {
    const field = err.meta?.target || 'Field';
    const message = `Duplicate field value entered: ${field}`;
    error = { message, statusCode: 400 };
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

module.exports = errorHandler;
