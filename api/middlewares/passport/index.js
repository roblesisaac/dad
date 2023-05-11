import passport from 'passport';
import { LocalStrategy } from './local';
import { GoogleStrategy } from './google';
import users from '../../models/users';

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (_id, done) => {
    done(null, await users.find(_id));
});

passport.use(LocalStrategy);
passport.use(GoogleStrategy);

export { passport };