require('dotenv').config();
const path = require('path');

module.exports = {
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
  profilePicCachePath: path.normalize(path.resolve(__dirname, '..', 'tmp', 'wa-profile-pics')),
  port: process.env.PORT || 3001,
  mediaCachePath: path.normalize(path.resolve(__dirname, '..', 'tmp', 'wa-media')),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

