require('dotenv').config();
const app       = require('./app');
const connectDB = require('./config/db');
const { expireStalePassesAndVisitors } = require('./services/passService');

const PORT = process.env.PORT || 5000;

// ─── Expiration job ────────────────────────────────────────────────────────────
// Runs every 5 minutes to mark expired passes & visitors in MongoDB.
// This ensures backend state is always consistent regardless of frontend activity.
const scheduleExpirationJob = () => {
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const run = async () => {
    try {
      const result = await expireStalePassesAndVisitors();
      if (result.expiredPasses > 0 || result.expiredVisitors > 0) {
        console.log(`⏰ Expiration job: ${result.expiredPasses} passes, ${result.expiredVisitors} visitors expired.`);
      }
    } catch (err) {
      console.error('Expiration job error:', err.message);
    }
  };
  // Run once on startup, then every interval
  run();
  setInterval(run, INTERVAL_MS);
};

const startServer = async () => {
  await connectDB();
  scheduleExpirationJob();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
};

startServer();
