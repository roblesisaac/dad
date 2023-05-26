import Record from '../utils/recordJS';
import bcrypt from 'bcryptjs';
import { isValidEmail } from '../../src/utils';

const users = Record('users', {
    email: {
        unique: true,
        required: true,
        value: email => {
            if(!isValidEmail(email)) {
                throw new Error('Invalid email');
            }

            return email;
        }
    },
    email_verified: '*',
    password: {
        value: async password => {
            if(!password) return;
            const bcryptRegex = /^\$2[ab]\$\d{1,2}\$[./0-9A-Za-z]{53}$/;
            const isAlreadyHashed = bcryptRegex.test(password);

            if(isAlreadyHashed) {
                return password;
            }

            if(password.length < 8) {
                throw new Error('Password must be at least 8 characters long.');
            }

            const salt = await bcrypt.genSalt(12);
            return await bcrypt.hash(password, salt);
        }
    },
    role: {
        value: String,
        default: 'member'
    },
    label1: 'email',
    label2: 'email_verified',
    label3: 'role'
});

users.authLocalUser = async (email, password, done) => {
    const errorMessage = `The username or password you provided is incorrect.`;

    if (!email || !password) {
      return done(`Missing 'email' or 'password' properties.`, false);
    }
  
    const user = await users.findOne({ email });
  
    if (!user || !user.password) {
      return done(errorMessage, false);
    }
  
    const isCorrectPassword = await bcrypt.compare(password, user.password);
  
    if (!isCorrectPassword) {
      return done(errorMessage, false);
    }
  
    return done(null, user);
}

export default users;