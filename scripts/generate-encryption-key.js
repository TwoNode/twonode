const crypto = require('crypto');

// Generate a secure 32-byte (256-bit) key
const key = crypto.randomBytes(32);

console.log('Generated encryption key:');
console.log('Add this to your .env file:');
console.log(`COOKIE_ENCRYPTION_KEY=${key.toString('hex')}`);
console.log('\nMake sure to keep this key secure and never commit it to version control!'); 