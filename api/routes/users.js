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
    googleCallback
} from '../controllers/users';

export default (api, baseUrl) => {
    const protect = protectedRoute(api, 'users', baseUrl);

    protect.get('/users', ['member'], function(req, _, next) {
        const { email } = req.user;

        req.query = { ...req.query, email };
        next();
    }, data.get);

    protect.get('/allusers', 'admin', data.get);

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

    api.get(
        '/logout',
        checkLoggedIn,
        logoutUser
    );
}