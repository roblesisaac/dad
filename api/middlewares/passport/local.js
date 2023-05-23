import { Strategy } from 'passport-local';
import users from '../../schemas/users';

export const LocalStrategy = new Strategy({ usernameField: 'email' }, users.authLocalUser);