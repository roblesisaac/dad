import {
    recaptcha,
    checkLoggedIn,
    checkVerified,
    rateLimiter
} from '../middlewares';

import db from '../controllers/db';

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
        '/login/auth/google', 
        rateLimiter, 
        loginGoogle
    );

    api.get(
        '/login/auth/google/callback',
        googleCallback
    );

    api.post(
        baseUrl + '/signup/native',
        rateLimiter,
        recaptcha, 
        signupUser
    );

    api.post(
        '/signup/verify',
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
        '/login/check',
        isLoggedIn
    );

    api.get(
        '/logout',
        checkLoggedIn,
        logoutUser
    );
    
    const endpoint = '/:component/db/';
    const endpointWithId = endpoint+':id';    

    api.get(endpoint, checkVerified, (req, res) => db.find(req, res));
    api.get(endpointWithId, (req, res) => db.findOne(req, res));
    
    api.put(endpointWithId, (req, res) => db.updateOne(req, res));
    api.put(endpoint, (req, res) => db.updateMany(req, res));
    
    api.post(endpoint, (req, res) => db.insert(req, res));
    
    api.delete(endpointWithId, (req, res) => db.deleteOne(req, res));
    api.delete(endpoint, (req, res) => db.deleteMany(req, res));
}