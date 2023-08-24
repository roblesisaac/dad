import { params } from '@ampt/sdk';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

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

export function decrypt(encrypted, dataType='string') {
  let encryptedText = Buffer.from(encrypted, 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY, 'hex'), Buffer.from(ENCRYPT_IV, 'hex'));
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return {
    buffer: decrypted,
    string: decrypted.toString()
  }[dataType] || decrypted;
}


export function encrypt(text) {
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY, 'hex'), Buffer.from(ENCRYPT_IV, 'hex'));
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString('hex');
}

export function encryptWithKey(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encryptedData = cipher.update(data, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  
  const authenticationTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + encryptedData + ':' + authenticationTag;
};

export function decryptWithKey(encryptedData, key) {
  const [ivHex, encryptedText, authenticationTagHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authenticationTag = Buffer.from(authenticationTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authenticationTag);
  
  let decryptedData = decipher.update(encryptedText, 'hex', 'utf8');
  decryptedData += decipher.final('utf8');
  
  return decryptedData;
};

export function generateSymmetricKey() {
  return crypto.randomBytes(32); // 256-bit key
};

export function generateToken(payload) {
  const exp = Math.floor(Date.now() / 1000) + (60 * 60);
  return jwt.sign({ payload, exp }, RSA.PRIVATE, { algorithm: 'RS256' });
}