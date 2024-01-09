import { events, params } from '@ampt/sdk';
import { Strategy } from 'passport-google-oauth20';
import Users from '../../models/users';

const {
    GOOGLE_ID,
    GOOGLE_SECRET,
    AMPT_URL,
    ENV_NAME
} = params().list();

const hostName = AMPT_URL.replace('https://', '');
const environment = ENV_NAME === 'prod' ? 'development' : 'sandbox';
const baseUrl = environment === 'sandbox' ? AMPT_URL : 'https://tracktabs.com';
const domain = environment === 'sandbox' ? '.'+hostName : '.tracktabs.com';

const GoogleConfig = {
    clientID: GOOGLE_ID,
    clientSecret: GOOGLE_SECRET,
    callbackURL: `${baseUrl}/api/login/auth/google/callback`,
    passReqToCallback: true
};

function isValidClientHost(req) {
    const clientHost = '.'+req.headers.host;
    return clientHost === domain;
}

async function authGoogleUser(req, accessToken, refreshToken, profile, done) {
    if(!isValidClientHost(req)) {
        return done(new Error('Invalid hostname'));
    }

    const { email } = profile._json;  
    const existingUser = await Users.findUser(email);
    
    const user = { 
        accessToken,
        ...profile._json 
    };
  
    if(existingUser) {
        return done(null, await Users.updateUser(email, user));
    }

    const newUser = await Users.save(user);
    events.publish('users.saved', newUser);

    return done(null, newUser);
}

export const GoogleStrategy = new Strategy(GoogleConfig, authGoogleUser);