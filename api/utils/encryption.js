import { params } from "@ampt/sdk";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const { 
    CRYPT_KEY,
    CRYPT_IV,
    RSA_PRIVATE,
    RSA_PUBLIC
} = params().list();
  
const RSA = { 
    PRIVATE: RSA_PRIVATE.replace(/\\n/g, "\n"), 
    PUBLIC: RSA_PUBLIC.replace(/\\n/g, "\n") 
};

const ENCRYPT_KEY = JSON.parse(CRYPT_KEY);
const ENCRYPT_IV = JSON.parse(CRYPT_IV);

export function decodeJWT(token) {
    return jwt.verify(token, RSA.PUBLIC, { algorithm: "RS256" });
}

export function decrypt(encrypted) {
    let encryptedText = Buffer.from(encrypted, "hex");
    let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPT_KEY, "hex"), Buffer.from(ENCRYPT_IV, "hex"));
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

export function encrypt(text) {
    let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPT_KEY, "hex"), Buffer.from(ENCRYPT_IV, "hex"));
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString("hex");
}

export function generateToken(payload) {
    const exp = Math.floor(Date.now() / 1000) + (60 * 60);
    return jwt.sign({ payload, exp }, RSA.PRIVATE, { algorithm: "RS256" });
}