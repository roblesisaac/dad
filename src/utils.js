export function arraysMatch(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}

export async function delay(s) {
  return new Promise(resolve => setTimeout(resolve, s*1000));
}

export function fontColor(amt) {
  return amt > 0
    ? 'font-color-positive' 
    : amt === 0
    ? 'font-color-neutral'
    : 'font-color-negative'
}

export function formatDate(inputDate) { // outputs YYYY-MM-DD
  const date = new Date(inputDate);
  
  if (isNaN(date)) {
    throw new Error('Invalid date input');
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export function formatPrice(value, { toFixed = 2, thousands = true } = {}) {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numericValue)) {
    return 'Invalid Price';
  }

  let formatted = numericValue.toFixed(toFixed);

  if (thousands) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }

  return '$' + formatted;
}

export const generateDate = (function() {
  function format(num, pad = 2) {
    return String(num).padStart(pad, '0');
  }

  function generateRandomTime() {
      const hours = String(Math.floor(Math.random() * 24)).padStart(2, '0');
      const mins = String(Math.floor(Math.random() * 60)).padStart(2, '0');
      const seconds = String(Math.floor(Math.random() * 60)).padStart(2, '0');
      return `-${hours}-${mins}-${seconds}`;
  }

  function isMissingTime(date) {
      return !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(date);
  }

  function pacificTimezoneOffset() { 
      return -7 * 60 * 60 * 1000;
  };

  function validDate(inputDate) {
      if (inputDate) {
          const [year, month, day, hours, minutes, seconds] = inputDate.split('-');
          return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
      } else {
          return new Date(Date.now() + pacificTimezoneOffset());
      }
  }

  return (inputDate) => {
      if (inputDate && isMissingTime(inputDate)) {
          inputDate += generateRandomTime();
      }

      const d = validDate(inputDate);           
      const year = d.getUTCFullYear();        
      const month = format(d.getUTCMonth() + 1);
      const day = format(d.getUTCDate());
      const hours = format(d.getUTCHours());
      const minutes = format(d.getUTCMinutes());
      const seconds = format(d.getUTCSeconds());
      
      return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}Z`;
  }
})();

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

export function isEmptyObject(obj) {
  if(!obj) return false;
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

export function buildId(yyyymmdd) {
  const random = Math.random().toString(16).substring(2);
  return `${generateDate(yyyymmdd)}_${random}`;
}

export function dateFromId(id) {
  const hexStamp = id.substring(0, 11);
  const timestamp = parseInt(hexStamp, 16);
  return timestamp;
}

export function sum(num1, num2) {
  const parsedNum1 = parseFloat(num1.replace(/[^0-9.]/g, ''));
  const parsedNum2 = parseFloat(num2.replace(/[^0-9.]/g, ''));
  const sum = parsedNum1 + parsedNum2;

  return isNaN(sum) ? 0 : sum;
}