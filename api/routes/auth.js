import { checkLoggedIn, rateLimiter, recaptcha } from '../middlewares/auth';

import app from '../controllers/auth';

export default (api, baseUrl) => {
  api.get(
    baseUrl + '/login/check/auth',
    app.isLoggedIn
  );
  
  api.get(
    baseUrl + '/login/auth/google/callback',
    app.googleCallback
  );

  api.get(
    baseUrl + '/login/auth/google', 
    rateLimiter, 
    app.loginGoogle
  );

  api.post(
    baseUrl + '/login/native', 
    rateLimiter, 
    recaptcha, 
    app.loginLocal
  );

  api.get(
    '/logout',
    checkLoggedIn,
    app.logoutUser
  );

  api.post(
    baseUrl + '/signup/resend', 
    checkLoggedIn, 
    app.resendVerificationCode
  );

  api.get(
    baseUrl + '/resetpasswordtemporary/:code',
    app.resetTemporaryPassword
  );

  api.post(
    baseUrl + '/requestpasswordreset/:email',
    recaptcha, 
    app.sendPasswordResetRequest
  );

  api.post(
    baseUrl + '/signup/native',
    rateLimiter,
    recaptcha, 
    app.signupUser
  );

  api.post(
    baseUrl + '/signup/verify',
    rateLimiter,
    checkLoggedIn, 
    app.verifyUser
  );
}