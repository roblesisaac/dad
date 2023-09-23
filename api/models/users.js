import Record from '../utils/records';
import { hashPassword, comparePassword } from '../utils/auth';
import { encrypt, decrypt, generateSymmetricKey } from '../utils/encryption';
import { isValidEmail } from '../../src/utils';

const users = Record('users', {
  email: {
    unique: true,
    required: true,
    value: email => {
      if(!isValidEmail(email)) {
        throw new Error('Invalid email');
      }
      
      return encrypt(email);
    },
    get: decrypt
  },
  views: [String],
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
      
      return await hashPassword(password);
    }
  },
  encryptionKey: {
    value: _ => encrypt(generateSymmetricKey()),
    get: v => decrypt(v, 'buffer'),
    isLocked: true
  },
  role: {
    value: String,
    default: 'member'
  },
  hideAllViews: {
    value: Boolean,
    default: false
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
  
  const user = await users.findUser(email);
  
  if (!user || !user.password) {
    return done(errorMessage, false);
  }
  
  const isCorrectPassword = await comparePassword(password, user.password);
  
  if (!isCorrectPassword) {
    return done(errorMessage, false);
  }

  return done(null, user);
}

users.findUser = async email => {
  const filter = encrypt(email);
  return await users.findOne({ email: filter })
}

users.updateUser = async (email, update) => await users.update({ email: encrypt(email) }, update);

export default users;