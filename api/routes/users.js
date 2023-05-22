import {
    recaptcha,
    checkLoggedIn,
    rateLimiter
} from '../middlewares';

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
        baseUrl + '/login/check',
        isLoggedIn
    );

    api.get(
        '/logout',
        checkLoggedIn,
        logoutUser
    );
}