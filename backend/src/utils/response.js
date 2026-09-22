/**
 * Sends a standardized success JSON response
 */
export const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Sends a standardized error JSON response
 */
export const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const body = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (typeof errors === 'string') {
    body.code = errors;
  } else if (errors != null) {
    body.errors = errors;
    if (errors.code) body.code = errors.code;
  }
  return res.status(statusCode).json(body);
};
