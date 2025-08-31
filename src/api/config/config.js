const path = require('path');

module.exports = {
  port: 3001,
  mediaCachePath: path.normalize(path.resolve(__dirname, '..', 'tmp', 'wa-media')),
  corsOrigin: 'http://localhost:5173',
};