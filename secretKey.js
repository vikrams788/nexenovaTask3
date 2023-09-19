const crypto = require('crypto');

const generateSecretKey = () => {
  //creates a random key
  return crypto.randomBytes(32).toString('hex');
};

module.exports = generateSecretKey;
