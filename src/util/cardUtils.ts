import crypto from 'crypto';
import config from '../config';

const ENCRYPTION_KEY = config.payment.card_encryption_key as string; // Must be 32 bytes for aes-256-gcm
const IV_LENGTH = 16;

export const encryptCardNumber = (cardNumber: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let encrypted = cipher.update(cardNumber, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return IV:AuthTag:EncryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

export const decryptCardNumber = (encrypted: string): string => {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

export const maskCardNumber = (cardNumber: string): string => {
  return `**** **** **** ${cardNumber.slice(-4)}`;
};

export const getLastFourDigits = (cardNumber: string): string => {
  return cardNumber.slice(-4);
};

export const validateCardNumber = (cardNumber: string): boolean => {
  // Remove any spaces or dashes
  cardNumber = cardNumber.replace(/[\s-]/g, '');

  // Check if the card number contains only digits
  if (!/^\d+$/.test(cardNumber)) return false;

  // Implement Luhn algorithm
  let sum = 0;
  let isEven = false;

  // Loop through values starting from the rightmost digit
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i));

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

export const detectCardType = (cardNumber: string): string => {
  // Remove any spaces or dashes
  cardNumber = cardNumber.replace(/[\s-]/g, '');

  // Visa
  if (/^4/.test(cardNumber)) {
    return 'visa';
  }

  // Mastercard
  if (/^5[1-5]/.test(cardNumber)) {
    return 'mastercard';
  }

  // PayPal (this is just an example, as PayPal doesn't have specific card numbers)
  if (/^6/.test(cardNumber)) {
    return 'paypal';
  }

  return 'unknown';
};
