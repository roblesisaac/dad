import { params } from '@ampt/sdk';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function ENCRYPT_KEY() {
  return JSON.parse(params('CRYPT_KEY'));
}

function ENCRYPT_IV() {
  return JSON.parse(params('CRYPT_IV'));
}

export function decodeJWT(token) {
  const rsa_public = params('RSA_PUBLIC').replace(/\\n/g, '\n');
  return jwt.verify(token, rsa_public, { algorithm: 'RS256' });
}

export function decrypt(encryptedData, dataType) {
  try {
    let encryptedText = Buffer.from(encryptedData, 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY(), 'hex'), Buffer.from(ENCRYPT_IV(), 'hex'));
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return {
      buffer: decrypted,
      string: decrypted.toString()
    }[dataType] || decrypted.toString();
  } catch (error) {
    throw new Error(`Error decrypting - ${error.message} Data: ${JSON.stringify(encryptedData)}.`);
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
    throw error;
  }
}

export function encrypt(data) {
  try {
    if (typeof data === 'number') {
      data = data.toString();
    }

    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY(), 'hex'), Buffer.from(ENCRYPT_IV(), 'hex'));
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
  const rsa_private = params('RSA_PRIVATE').replace(/\\n/g, '\n');
  
  return jwt.sign({ payload, exp }, rsa_private, { algorithm: 'RS256' });
}
