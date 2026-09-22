import prisma from '../config/db.js';
import { verifyToken } from '../utils/token.js';
import { errorResponse } from '../utils/response.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Unauthorized - No session token provided');
  }

  try {
    const decoded = verifyToken(token);

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

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
      return errorResponse(res, 401, 'Unauthorized - Session token expired or invalid');
    }
    return next(error);
  }
};
