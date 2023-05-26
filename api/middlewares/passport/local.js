import { Strategy } from 'passport-local';
import Users from '../../models/users';

export const LocalStrategy = new Strategy({ usernameField: 'email' }, Users.authLocalUser);