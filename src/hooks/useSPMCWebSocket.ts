/**
 * Hook for real-time SPMC WebSocket updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { spmcWebSocket, SPMCWebSocketClient } from '@/services/spmc/websocket';
import { SPMCPriceUpdate, SPMCMarketUpdate } from '@/services/spmc/websocket';

interface UseSPMCWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnError?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

/**
 * Hook for managing SPMC WebSocket connection
 */
export function useSPMCWebSocket(options: UseSPMCWebSocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<SPMCWebSocketClient>(spmcWebSocket);

  const {
    autoConnect = true,
    reconnectOnError = true,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const connect = useCallback(async () => {
    if (connected || connecting) return;

    setConnecting(true);
    setError(null);

    try {
      await wsRef.current.connect();
      setConnected(true);
      onConnect?.();
    } catch (err) {
      setError(err as Error);
      onError?.(err);
      
      if (reconnectOnError) {
        // Retry connection after delay
        setTimeout(() => {
          connect();
        }, 5000);
      }
    } finally {
      setConnecting(false);
    }
  }, [connected, connecting, onConnect, onError, reconnectOnError]);

  const disconnect = useCallback(() => {
    wsRef.current.disconnect();
    setConnected(false);
    onDisconnect?.();
  }, [onDisconnect]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const status = wsRef.current.getStatus();
      setConnected(status.connected);
      setConnecting(status.connecting);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      if (connected) {
        disconnect();
      }
    };
  }, []);

  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    ws: wsRef.current,
  };
}

/**
 * Hook for subscribing to price updates
 */
export function useSPMCPriceUpdates(
  marketIds: string[],
  enabled = true
) {
  const [latestPrices, setLatestPrices] = useState<Record<string, SPMCPriceUpdate>>({});
  const [updateCount, setUpdateCount] = useState(0);
  const { connected, ws } = useSPMCWebSocket({ autoConnect: enabled });

  useEffect(() => {
    if (!connected || !enabled || marketIds.length === 0) return;

    const unsubscribe = ws.subscribeToPrices(marketIds, (update) => {
      setLatestPrices(prev => ({
        ...prev,
        [update.marketId]: update,
      }));
      setUpdateCount(count => count + 1);
    });

    return unsubscribe;
  }, [connected, enabled, JSON.stringify(marketIds)]);

  return {
    prices: latestPrices,
    updateCount,
    connected,
  };
}

/**
 * Hook for subscribing to market updates
 */
export function useSPMCMarketUpdates(enabled = true) {
  const [marketUpdates, setMarketUpdates] = useState<SPMCMarketUpdate[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<SPMCMarketUpdate | null>(null);
  const { connected, ws } = useSPMCWebSocket({ autoConnect: enabled });

  useEffect(() => {
    if (!connected || !enabled) return;

    const unsubscribe = ws.subscribeToMarkets((update) => {
      setLatestUpdate(update);
      setMarketUpdates(prev => [...prev.slice(-99), update]); // Keep last 100 updates
    });

    return unsubscribe;
  }, [connected, enabled]);

  const clearUpdates = () => {
    setMarketUpdates([]);
    setLatestUpdate(null);
  };

  return {
    updates: marketUpdates,
    latestUpdate,
    connected,
    clearUpdates,
  };
}

/**
 * Hook for subscribing to custom events
 */
export function useSPMCSubscription<T = any>(
  event: string,
  callback: (data: T) => void,
  enabled = true
) {
  const { connected, ws } = useSPMCWebSocket({ autoConnect: enabled });

  useEffect(() => {
    if (!connected || !enabled) return;

    return ws.subscribe(event, callback);
  }, [connected, enabled, event]);

  return { connected };
}

/**
 * Combined hook for all SPMC real-time features
 */
export function useSPMCRealtime(marketIds: string[] = []) {
  const [priceHistory, setPriceHistory] = useState<Record<string, SPMCPriceUpdate[]>>({});
  
  const { connected, connecting, error, connect, disconnect } = useSPMCWebSocket();
  const { prices, updateCount } = useSPMCPriceUpdates(marketIds, connected);
  const { updates: marketUpdates, latestUpdate } = useSPMCMarketUpdates(connected);

  // Track price history
  useEffect(() => {
    Object.entries(prices).forEach(([marketId, update]) => {
      setPriceHistory(prev => ({
        ...prev,
        [marketId]: [...(prev[marketId] || []).slice(-49), update], // Keep last 50 prices
      }));
    });
  }, [prices]);

  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    prices,
    priceHistory,
    priceUpdateCount: updateCount,
    marketUpdates,
    latestMarketUpdate: latestUpdate,
  };
}