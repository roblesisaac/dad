import { Strategy } from 'passport-local';
import users from '../../records/users';

export const LocalStrategy = new Strategy({ usernameField: 'email' }, users.authLocalUser);