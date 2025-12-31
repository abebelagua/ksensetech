export default () => ({
  api: {
    baseUrl: process.env.API_BASE_URL,
    key: process.env.API_KEY,
  },
  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES || '10', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10),
  },
});
