import { errorResponse } from '../utils/response.js';

/**
 * Restricts access to specific role collections
 * @param {...String} roles - Allowed roles for this endpoint
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized - No user session context found');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, `Forbidden - Access restricted to [${roles.join(', ')}] roles`);
    }

    next();
  };
};
