/**
 * Jest global teardown — closes DB connection after all tests.
 */
module.exports = async () => {
  if (global.__MONGOOSE__) {
    await global.__MONGOOSE__.disconnect();
    console.log('\n✅ Test DB disconnected.');
  }
};
