import { params } from '@ampt/sdk';
import { Strategy } from 'passport-google-oauth20';
import Users from '../../records/users';

const {
    GOOGLE_ID,
    GOOGLE_SECRET,
    AMPT_URL,
} = params().list();

const hostName = AMPT_URL.replace('https://', '');
const domain = '.'+hostName;

const GoogleConfig = {
    clientID: GOOGLE_ID,
    clientSecret: GOOGLE_SECRET,
    callbackURL: `${AMPT_URL}/api/login/auth/google/callback`,
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
    const existingUser = await Users.find({ email });
    
    const user = { 
        accessToken,
        ...profile._json 
    };
  
    if(existingUser) {
        return done(null, await Users.update({ email }, user));
    }

    const newUser = await Users.save(user);
    return done(null, newUser);
}

export const GoogleStrategy = new Strategy(GoogleConfig, authGoogleUser);