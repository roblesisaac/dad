import { params } from '@ampt/sdk';
import { auth } from 'express-oauth2-jwt-bearer';
import rateLimit from 'express-rate-limit';
import userService from '../services/userService.js';

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
export async function checkLoggedIn(req, res, next) {
  try {
    if (!req.auth) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No valid authentication token provided' 
      });
    }

    // Extract user information from the JWT token
    const { payload } = req.auth;
    const metadata = payload[`${audience}/user_metadata`] || {};
    const email = payload[`${audience}/email`]
    
    // Create user object
    req.user = {
      _id: metadata.legacyId || email,
      sub: payload.sub,
      email,
      roles: payload[`${audience}/roles`],
      metadata,
      appMetadata: payload[`${audience}/app_metadata`] || {}
    };

    // Ensure user has an encryption key
    req.user.encryptionKey = await userService.ensureUserEncryptionKey(req.user);
    next();
  } catch (error) {
    console.error('Error ensuring user encryption key:', error);
    next();
  }
}