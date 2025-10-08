/**
 * SPMC WebSocket Client
 * Real-time data streaming from SPMC server
 */

import { SPMCPriceData, SPMCMarket, Platform } from './types';

export interface SPMCWebSocketConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface SPMCWebSocketMessage {
  type: 'price_update' | 'market_update' | 'status_update' | 'error' | 'ping' | 'pong';
  data?: any;
  timestamp: string;
}

export interface SPMCPriceUpdate {
  marketId: string;
  platform: Platform;
  prices: SPMCPriceData;
  timestamp: string;
}

export interface SPMCMarketUpdate {
  market: SPMCMarket;
  updateType: 'created' | 'updated' | 'closed';
  timestamp: string;
}

export class SPMCWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private heartbeatInterval: number;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting = false;
  private isConnected = false;

  constructor(config?: SPMCWebSocketConfig) {
    // Determine WebSocket URL from SPMC API URL
    const baseUrl = process.env.FASTAPI_BASE_URL || process.env.NEXT_PUBLIC_SPMC_URL || 'https://api.spmc.dev';
    const wsUrl = baseUrl.replace(/^http/, 'ws').replace(/^https/, 'wss');
    
    this.url = config?.url || `${wsUrl}/ws`;
    this.reconnectInterval = config?.reconnectInterval || 5000;
    this.maxReconnectAttempts = config?.maxReconnectAttempts || 10;
    this.heartbeatInterval = config?.heartbeatInterval || 30000;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for current connection attempt
        const checkConnection = setInterval(() => {
          if (this.isConnected) {
            clearInterval(checkConnection);
            resolve();
          } else if (!this.isConnecting) {
            clearInterval(checkConnection);
            reject(new Error('Connection failed'));
          }
        }, 100);
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('SPMC WebSocket connected');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          console.error('SPMC WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('SPMC WebSocket disconnected');
          this.isConnected = false;
          this.isConnecting = false;
          this.stopHeartbeat();
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.stopReconnect();
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe(event: string, callback: (data: any) => void) {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    this.subscriptions.get(event)!.add(callback);

    // Send subscription message to server if connected
    if (this.isConnected) {
      this.send({
        type: 'subscribe',
        event,
      });
    }

    return () => this.unsubscribe(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(event: string, callback: (data: any) => void) {
    const callbacks = this.subscriptions.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(event);
        
        // Send unsubscribe message to server if connected
        if (this.isConnected) {
          this.send({
            type: 'unsubscribe',
            event,
          });
        }
      }
    }
  }

  /**
   * Subscribe to price updates for specific markets
   */
  subscribeToPrices(marketIds: string[], callback: (update: SPMCPriceUpdate) => void) {
    return this.subscribe('price_updates', (data) => {
      if (marketIds.includes(data.marketId)) {
        callback(data);
      }
    });
  }

  /**
   * Subscribe to all market updates
   */
  subscribeToMarkets(callback: (update: SPMCMarketUpdate) => void) {
    return this.subscribe('market_updates', callback);
  }

  /**
   * Send a message to the server
   */
  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent) {
    try {
      const message: SPMCWebSocketMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'price_update':
          this.emit('price_updates', message.data);
          break;
        case 'market_update':
          this.emit('market_updates', message.data);
          break;
        case 'status_update':
          this.emit('status_updates', message.data);
          break;
        case 'error':
          console.error('SPMC WebSocket error message:', message.data);
          this.emit('errors', message.data);
          break;
        case 'pong':
          // Heartbeat response received
          break;
        default:
          console.log('Unknown SPMC WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing SPMC WebSocket message:', error);
    }
  }

  /**
   * Emit event to subscribers
   */
  private emit(event: string, data: any) {
    const callbacks = this.subscriptions.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Attempt to reconnect after disconnect
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for SPMC WebSocket');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting SPMC WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('SPMC WebSocket reconnection failed:', error);
      });
    }, this.reconnectInterval);
  }

  /**
   * Stop reconnection attempts
   */
  private stopReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; connecting: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Singleton instance
export const spmcWebSocket = new SPMCWebSocketClient();