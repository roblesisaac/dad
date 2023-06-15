import { data } from '@ampt/data';
import passport from 'passport';
import { LocalStrategy } from './local';
import { GoogleStrategy } from './google';

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (_id, done) => {
    const user = await data.get(_id);
    done(null, { _id, ...user });
});

passport.use(LocalStrategy);
passport.use(GoogleStrategy);

export { passport };