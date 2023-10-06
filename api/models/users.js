import AmptModel from '../utils/amptModel';
import { hashPassword, comparePassword } from '../utils/auth';
import { encrypt, decrypt, generateSymmetricKey } from '../utils/encryption';
import { isValidEmail } from '../../src/utils';

const Users = AmptModel('users', {
  email: {
    unique: true,
    required: true,
    get: decrypt,
    validate: isValidEmail,
    set: encrypt
  },
  views: [String],
  email_verified: '*',
  password: {
    set: async (value) => {
      if(!value) {
        return;
      };

      if(value.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      return await hashPassword(value);
    }
  },
  encryptionKey: {
    set: () => encrypt(generateSymmetricKey()),
    get: (value) => decrypt(value, 'buffer')
  },
  role: {
    default: 'member',
    type: String
  },
  hideAllViews: {
    type: Boolean,
    default: false
  },
  lastLoggedIn: () => String(new Date()),
  label1: 'email',
  label2: 'email_verified',
  label3: 'role'
});

Users.authLocalUser = async (email, password, done) => {
  const errorMessage = `The username or password you provided is incorrect.`;
  
  if (!email || !password) {
    return done(`Missing 'email' or 'password' properties.`, false);
  }
  
  const user = await Users.findUser(email);
  
  if (!user || !user.password) {
    return done(errorMessage, false);
  }
  
  const isCorrectPassword = await comparePassword(password, user.password);
  
  if (!isCorrectPassword) {
    return done(errorMessage, false);
  }

  return done(null, user);
}

Users.findUser = async (email) => await Users.findOne({ email: encrypt(email) });

Users.eraseUser = async (email) => await Users.erase({ email: encrypt(email) });

Users.updateUser = async (email, update) => await Users.update({ email: encrypt(email) }, update);

export default Users;