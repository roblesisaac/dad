import Users from '../../models/users';
import passport from 'passport';
import { LocalStrategy } from './local';
import { GoogleStrategy } from './google';

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (_id, done) => {
    done(null, await Users.findOne(_id));
});

passport.use(LocalStrategy);
passport.use(GoogleStrategy);

export { passport };