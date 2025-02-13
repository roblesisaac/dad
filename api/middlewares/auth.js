import { params } from '@ampt/sdk';
import { auth } from 'express-oauth2-jwt-bearer';
import rateLimit from 'express-rate-limit';

const { VITE_ZERO_DOMAIN, VITE_ZERO_AUDIENCE } = params().list();

console.log({
  VITE_ZERO_DOMAIN, VITE_ZERO_AUDIENCE
});

const audience = VITE_ZERO_AUDIENCE;
const domain = VITE_ZERO_DOMAIN;

// Auth0 JWT validation middleware
export const checkJWT = auth({
  audience,
  issuerBaseURL: `https://${domain}`,
  tokenSigningAlg: 'RS256'
});

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

// Middleware to check if user is authenticated
export function checkLoggedIn(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'No valid authentication token provided' 
    });
  }
  next();
}

// Middleware to check user permissions
export function checkPermissions(requiredPermissions) {
  return (req, res, next) => {
    const permissions = req.auth?.payload?.permissions || [];
    
    const hasAllPermissions = requiredPermissions.every(
      permission => permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'You do not have the required permissions to access this resource',
        required: requiredPermissions,
        provided: permissions
      });
    }

    next();
  };
}