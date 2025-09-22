/**
 * SPMC Service Exports
 * Central export point for all SPMC-related functionality
 */

export { SPMCClient, spmcClient } from './client';
export * from './types';
export { transformMarketData } from './transformers';
export { SPMCWebSocketClient } from './websocket';