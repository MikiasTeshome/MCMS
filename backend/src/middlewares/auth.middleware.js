import prisma from '../config/db.js';
import { verifyToken } from '../utils/token.js';
import { errorResponse } from '../utils/response.js';

export const protect = async (req, res, next) => {
  let token;

  // Check Authorization header for Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Unauthorized - No session token provided');
  }

  try {
    // Verify the JWT token
    const decoded = verifyToken(token);

    // Retrieve active user from db to confirm they exist and aren't deleted
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        campusId: true,
        campus: { select: { id: true, name: true, code: true } },
      },
    });

    if (!user || !user.isActive) {
      return errorResponse(res, 401, 'Unauthorized - Invalid or expired user session');
    }

    // Attach authenticated user information to Express request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
      return errorResponse(res, 401, 'Unauthorized - Session token expired or invalid');
    }
    return next(error);
  }
};
