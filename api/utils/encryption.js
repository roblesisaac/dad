import { params } from '@ampt/sdk';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const {
  CRYPT_KEY,
  CRYPT_IV,
  RSA_PRIVATE,
  RSA_PUBLIC
} = params().list();

const RSA = {
  PRIVATE: RSA_PRIVATE.replace(/\\n/g, '\n'),
  PUBLIC: RSA_PUBLIC.replace(/\\n/g, '\n')
};

const ENCRYPT_KEY = JSON.parse(CRYPT_KEY);
const ENCRYPT_IV = JSON.parse(CRYPT_IV);

export function decodeJWT(token) {
  return jwt.verify(token, RSA.PUBLIC, { algorithm: 'RS256' });
}

export function decrypt(encryptedData, dataType) {
  try {
    let encryptedText = Buffer.from(encryptedData, 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY, 'hex'), Buffer.from(ENCRYPT_IV, 'hex'));
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return {
      buffer: decrypted,
      string: decrypted.toString()
    }[dataType] || decrypted.toString();
  } catch (error) {
    console.error({
      errorMessage: `Error decrypting...`,
      encryptedData,
      error
    });
  }
}

export function decryptWithKey(encryptedData, key) {
  try {
    const [ivHex, encryptedText, authenticationTagHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authenticationTag = Buffer.from(authenticationTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authenticationTag);

    let decryptedData = decipher.update(encryptedText, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');

    return decryptedData;
  } catch (error) {
    console.error({
      decryptError: true,
      errorMessage: error.message,
      encryptedData,
      error,
      key
    });
  }
}

export function encrypt(data) {
  try {
    if (typeof data === 'number') {
      data = data.toString();
    }

    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY, 'hex'), Buffer.from(ENCRYPT_IV, 'hex'));
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('hex');

  } catch (error) {
    console.error({
      errorEncrypting: true,
      data,
      errorMessage: error.message
    });
  }
}

export function encryptWithKey(data, key) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encryptedData = cipher.update(data, 'utf8', 'hex');
    encryptedData += cipher.final('hex');

    const authenticationTag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + encryptedData + ':' + authenticationTag;
  } catch (error) {
    console.error({
      errorMessage: `Error encrypting with key...`,
      data,
      error,
      key
    });
  }
}

export function generateSymmetricKey() {
  return crypto.randomBytes(32);
}

export function generateToken(payload) {
  const exp = Math.floor(Date.now() / 1000) + (60 * 60);
  return jwt.sign({ payload, exp }, RSA.PRIVATE, { algorithm: 'RS256' });
}
