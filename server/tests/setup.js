/**
 * Jest global setup — only used for one-time config.
 * Note: globalSetup runs in a separate worker; it CANNOT share
 * mongoose connections with test workers. DB connection must be
 * established in each test file's beforeAll instead.
 */
require('dotenv').config();

module.exports = async () => {
  console.log('\n🧪 MoveInSync VMS — Test Suite Starting');
  console.log('📡 MONGO_URI:', process.env.MONGO_URI ? process.env.MONGO_URI.replace(/:([^@]+)@/, ':***@') : 'NOT SET');
};
