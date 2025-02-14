import { params } from '@ampt/sdk';
import { auth } from 'express-oauth2-jwt-bearer';
import rateLimit from 'express-rate-limit';

const { VITE_ZERO_DOMAIN, VITE_ZERO_AUDIENCE } = params().list();

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

// Enhanced middleware to check if user is authenticated and add user info
export function checkLoggedIn(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'No valid authentication token provided' 
    });
  }

  // Extract user information from the JWT token
  const { payload } = req.auth;
  
  // Debug: Log the payload to see what fields are available
  console.log('Auth0 Token Payload:', payload);
  
  // Add user information to req.user
  req.user = {
    sub: payload.sub,
    // Try different possible email field locations
    email: payload.email || 
           payload[`${audience}/email`] || 
           payload['https://my-app.com/email'] ||
           payload['https://my-app.com/user_email'] ||
           undefined,
    roles: payload[`${audience}/roles`],
    metadata: payload[`${audience}/user_metadata`] || {},
    appMetadata: payload[`${audience}/app_metadata`] || {}
  };

  // Debug: Log the constructed user object
  console.log('Constructed User Object:', req.user);

  next();
}