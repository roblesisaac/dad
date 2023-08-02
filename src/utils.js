export async function delay(s) {
    return new Promise(resolve => setTimeout(resolve, s*1000));
}

export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function proper(str) {
    if (!str) return '';

    return str.toLowerCase().replace(/\b(\w)/g, function(firstLetter) {
        return firstLetter.toUpperCase();
    });
}

export function randomString(length=8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export function randomNumber(length=6) {
    // Calculate the minimum and maximum values for the random number
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    
    // Generate a random number between min and max
    const randomNumber = Math.floor(Math.random() * (max - min + 1) + min);
    
    // Return the random number
    return randomNumber;
}

function todaysDate() {
    const pacificTimezoneOffset = -7 * 60 * 60 * 1000; // UTC-8
    const date = new Date(Date.now() + pacificTimezoneOffset);
    const year = date.getUTCFullYear();
    const format = (num, pad=2) => String(num).padStart(pad, '0');

    const month = format(date.getUTCMonth() + 1);
    const day = format(date.getUTCDate());
    const hours = format(date.getUTCHours());
    const minutes = format(date.getUTCMinutes());
    const seconds = format(date.getUTCSeconds());
    const milliseconds = format(date.getUTCMilliseconds(), 3);
    const datetime = `${year}-${month}-${day}-${hours}-${minutes}-${seconds}-${milliseconds}`;

    return datetime;
}

export function isEmptyObject(obj) {
    if(!obj) return false;
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}
  

export function buildId(timestamp) {
    // timestamp = timestamp || new Date().getTime().toString(16);
    const random = Math.random().toString(16).substring(2);
    return `${todaysDate()}_${random}`;
}

export function dateFromId(id) {
    const hexStamp = id.substring(0, 11);
    const timestamp = parseInt(hexStamp, 16);
    return timestamp;
}