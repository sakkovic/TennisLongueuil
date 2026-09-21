// Run unit tests in Québec time so date and daylight-saving tests are deterministic.
module.exports = async () => {
  process.env.TZ = 'America/Toronto';
};
