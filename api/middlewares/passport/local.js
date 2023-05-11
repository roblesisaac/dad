import { Strategy } from 'passport-local';
import users from '../../models/users';

export const LocalStrategy = new Strategy({ usernameField: 'email' }, users.authLocalUser);