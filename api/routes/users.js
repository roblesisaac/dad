import {
    recaptcha,
    checkLoggedIn,
    checkVerified
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
    api.post(baseUrl + '/login/native', recaptcha, loginLocal);
    api.get(baseUrl + '/login/auth/google', loginGoogle);
    api.get(baseUrl + '/login/auth/google/callback', googleCallback);
    api.post(baseUrl + '/signup/native', recaptcha, signupUser);
    api.post(baseUrl + '/signup/verify', checkLoggedIn, verifyUser);
    api.post(baseUrl + '/signup/resend', checkLoggedIn, resendVerificationCode);
    api.get('/login/check', isLoggedIn);
    api.get('/logout', checkLoggedIn, logoutUser);
    
    const endpoint = '/:component/db/';
    api.get(endpoint, checkVerified, (req, res) => db.find(req, res));
    api.get(endpoint+':id', (req, res) => db.findOne(req, res));
    
    api.put(endpoint+':id', (req, res) => db.updateOne(req, res));
    api.put(endpoint, (req, res) => db.updateMany(req, res));
    
    api.post(endpoint, (req, res) => db.insert(req, res));
    
    api.delete(endpoint+':id', (req, res) => db.deleteOne(req, res));
    api.delete(endpoint, (req, res) => db.deleteMany(req, res));
}