import { config, validateConfig } from './config.js';
import { initDatabase } from './db.js';
import { startListener } from './listener.js';
import { startAPI } from './api.js';
import { logger } from './utils/logger.js';

async function main() {
  logger.info('Starting Panboo Backend Service...');

  // Validate configuration
  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    logger.warn('Configuration warnings', { errors: configErrors });
    logger.warn('Service will run but some features may not work correctly');
  }

  // Initialize database
  try {
    await initDatabase();
  } catch (error) {
    logger.error('Failed to initialize database', { error: error.message });
    process.exit(1);
  }

  // Start API server
  try {
    await startAPI();
  } catch (error) {
    logger.error('Failed to start API server', { error: error.message });
    process.exit(1);
  }

  // Start blockchain listener
  if (configErrors.length === 0) {
    try {
      await startListener();
    } catch (error) {
      logger.error('Failed to start listener', { error: error.message });
      // Don't exit, API can still work without listener
    }
  } else {
    logger.info('Skipping blockchain listener due to configuration errors');
    logger.info('API server is running but will serve empty/mock data');
  }

  logger.info('Panboo Backend Service started successfully');
  logger.info('Configuration', {
    port: config.port,
    chainId: config.chainId,
    tokenAddress: config.tokenAddress,
    tursoUrl: config.tursoUrl,
  });
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the service
main().catch((error) => {
  logger.error('Fatal error', { error: error.message, stack: error.stack });
  process.exit(1);
});
