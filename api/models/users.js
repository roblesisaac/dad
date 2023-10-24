import AmptModel from '../utils/amptModel';
import { hashPassword, comparePassword } from '../utils/auth';
import { encrypt, decrypt, generateSymmetricKey } from '../utils/encryption';
import { isValidEmail } from '../../src/utils';

const userSchema = {
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
    set: async (value, { item }) => {
      if (!value && item.email_verified !== true) {
        throw new Error('Password is required');
      }

      if(!value) {
        return;
      }
    
      if (value.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const symbolRegex = /[$&+,:;=?@#|'<>.^*()%!-]/;
    
      if (!symbolRegex.test(value)) {
        throw new Error('Password must contain at least one symbol character');
      }

      const digitRegex = /\d/;

      if (!digitRegex.test(value)) {
        throw new Error('Password must contain at least one numeric character');
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
  lastLoggedIn: () => {
    const now = new Date();
    const pstOptions = { timeZone: 'America/Los_Angeles' };

    return now.toLocaleString('en-US', pstOptions);
  },
  label1: 'email',
  label2: 'email_verified',
  label3: 'role'
};

const Users = AmptModel('users', userSchema);

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

  await Users.updateUser(email, {});

  return done(null, user);
}

Users.findUser = async (email) => await Users.findOne({ email: encrypt(email) });

Users.eraseUser = async (email) => await Users.erase({ email: encrypt(email) });

Users.updateUser = async (email, update) => await Users.update({ email: encrypt(email) }, update);

export default Users;