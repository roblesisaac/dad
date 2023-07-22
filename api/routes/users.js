import protectedRoute from '../utils/protectedRoute';
import data from '../controllers/data';
import { recaptcha, checkLoggedIn, rateLimiter } from '../middlewares';
import {
  resendVerificationCode,
  signupUser, 
  verifyUser,
  isLoggedIn,
  logoutUser,
  loginLocal,
  loginGoogle,
  googleCallback,
  sendPasswordResetRequest,
  resetTemporaryPassword,
  updateUser
} from '../controllers/users';

export default (api, baseUrl) => {
const protect = protectedRoute(api, 'users', baseUrl);
const concatToQuery = (propName) => (req, _, next) => {
  req.query = { ...req.query, [propName]: req.user[propName] };
  next();
};

protect('member').get('/users', concatToQuery('email'), data.get);
protect('admin').get('/allusers', data.get);
protect('member').put('/users/:id', updateUser);

api.post(
  baseUrl + '/login/native', 
  rateLimiter, 
  recaptcha, 
  loginLocal
);

api.get(
  baseUrl + '/login/auth/google', 
  rateLimiter, 
  loginGoogle
);

api.get(
  baseUrl + '/login/auth/google/callback',
  googleCallback
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
          
api.post(
  baseUrl + '/signup/resend', 
  checkLoggedIn, 
  resendVerificationCode
);

api.get(
  baseUrl + '/login/check/auth',
  isLoggedIn
);

api.post(
  baseUrl + '/requestpasswordreset/:email',
  recaptcha, 
  sendPasswordResetRequest
);

api.get(
  baseUrl + '/resetpasswordtemporary/:code',
  resetTemporaryPassword
);

api.get(
  '/logout',
  checkLoggedIn,
  logoutUser
);
}