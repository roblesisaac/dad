import Record from '../utils/recordJS';
import bcrypt from 'bcryptjs';
import { isValidEmail } from '../../src/utils';

const users = Record('users', {
    email: {
        unique: true,
        required: true,
        value: input => {
            const { email } = input;
            if(!isValidEmail(email)) {
                throw new Error('Invalid email');
            }

            return email;
        }
    },
    email_verified: '*',
    password: {
        value: async input => {
            const { password } = input;
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
    label1: 'email',
    label2: 'email_verified'
});

users.authLocalUser = async (email, password, done) => {
    const errorMessage = `The username or password you provided is incorrect.`;

    if (!email || !password) {
      return done(`Missing 'email' or 'password' properties.`, false);
    }
  
    const user = await users.find({ email });
  
    if (!user) {
      return done(errorMessage, false);
    }
  
    if(!user.password) {
      return done(`Incorrect login information. Please try again.`, false);
    }
  
    const isCorrectPassword = await bcrypt.compare(password, user.password);
  
    if (!isCorrectPassword) {
      return done(errorMessage, false);
    }
  
    return done(null, user);
}

export default users;