import { params } from '@ampt/sdk';
import { Strategy } from 'passport-google-oauth20';
import Users from '../../models/users';

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
    callbackURL: `${AMPT_URL}/login/auth/google/callback`,
    passReqToCallback: true
};

function isValidClientHost(clientHost, validHost) {
    return clientHost === validHost;
}

async function authGoogleUser(req, accessToken, refreshToken, profile, done) {
    if(!isValidClientHost('.'+req.headers.host, domain)) {
      return done(new Error('Invalid hostname'));
    }
  
    const userData = profile._json;
  
    userData.accessToken = accessToken;
  
    const { email } = userData,
          existingUser = await Users.find({ email })
  
    if(!existingUser) {
      const newUser = await Users.save({ email, ...userData });
  
      return done(null, newUser);
    }
    
    await Users.save({ email }, userData);
  
    return done(null, existingUser);
}

export const GoogleStrategy = new Strategy(GoogleConfig, authGoogleUser);