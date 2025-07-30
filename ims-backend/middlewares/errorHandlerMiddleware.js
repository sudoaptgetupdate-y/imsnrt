// ims-backend/middlewares/errorHandlerMiddleware.js

const handlePrismaError = (err) => {
  switch (err.code) {
    case 'P2002':
      // Unique constraint failed
      // err.meta.target can be like ['username'] or ['modelNumber', 'brandId']
      const fields = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'fields';
      return {
        statusCode: 400,
        message: `The following fields must be unique: ${fields}. The value you entered is already in use.`
      };
    case 'P2025':
      // Record to update or delete not found
      return {
        statusCode: 404,
        message: 'The requested record was not found.'
      };
    case 'P2003':
        // Foreign key constraint failed
        // For example, trying to delete a category that is still linked to product models
        return {
            statusCode: 400,
            message: 'Cannot perform this action because the record is still linked to other data.'
        };
    default:
      // For other Prisma errors, return a generic message
      return {
        statusCode: 500,
        message: 'A database error occurred.'
      };
  }
};


const errorHandler = (err, req, res, next) => {
  console.error("ERROR LOG:", new Date().toLocaleString());
  console.error("REQUEST URL:", req.originalUrl);
  console.error("ERROR:", err);

  // Check if the error is a known Prisma error
  if (err.code && err.code.startsWith('P')) {
    const { statusCode, message } = handlePrismaError(err);
    return res.status(statusCode).json({ error: message });
  }

  // Check for custom errors we might throw, which have a statusCode property
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // For any other unexpected errors
  res.status(500).json({
    error: 'An unexpected error occurred on the server.'
  });
};

module.exports = errorHandler;