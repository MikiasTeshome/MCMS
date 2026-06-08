import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Signs a payload into a JWT access token
 * @param {Object} payload 
 * @returns {String} token
 */
export const signToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
};

/**
 * Verifies a JWT access token and decodes it
 * @param {String} token 
 * @returns {Object} decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};
