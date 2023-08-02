import { checkLoggedIn, rateLimiter, recaptcha } from '../middlewares/auth';

import {
  isLoggedIn,
  googleCallback,
  loginGoogle,
  loginLocal,
  logoutUser,
  resendVerificationCode,
  resetTemporaryPassword,
  sendPasswordResetRequest,
  signupUser, 
  verifyUser
} from '../controllers/auth';

export default (api, baseUrl) => {
  api.get(
    baseUrl + '/login/check/auth',
    isLoggedIn
  );
  
  api.get(
    baseUrl + '/login/auth/google/callback',
    googleCallback
  );

  api.get(
    baseUrl + '/login/auth/google', 
    rateLimiter, 
    loginGoogle
  );

  api.post(
    baseUrl + '/login/native', 
    rateLimiter, 
    recaptcha, 
    loginLocal
  );

  api.get(
    '/logout',
    checkLoggedIn,
    logoutUser
  );

  api.post(
    baseUrl + '/signup/resend', 
    checkLoggedIn, 
    resendVerificationCode
  );

  api.get(
    baseUrl + '/resetpasswordtemporary/:code',
    resetTemporaryPassword
  );

  api.post(
    baseUrl + '/requestpasswordreset/:email',
    recaptcha, 
    sendPasswordResetRequest
  );

  api.post(
    baseUrl + '/signup/native',
    rateLimiter,
    recaptcha, 
    signupUser
  );

  api.post(
    baseUrl + '/signup/verify',
    rateLimiter,
    checkLoggedIn, 
    verifyUser
  );
}