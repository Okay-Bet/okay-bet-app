import { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

export default function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const initSocket = async () => {
      if (!socketRef.current) {
        await fetch('/api/socketio');
        socketRef.current = io('http://localhost:3001', {
          path: '/api/socketio',
          transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
          setIsConnected(true);
        });

        socketRef.current.on('disconnect', () => {
          setIsConnected(false);
        });

        socketRef.current.on('contractEvent', (data: any) => {
          setLastEvent(data);
        });
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const emitEvent = useCallback((eventName: string, data?: any) => {
    if (socketRef.current) {
      socketRef.current.emit(eventName, data);
    } else {
      console.error('Socket is not initialized');
    }
  }, []);

  return { isConnected, lastEvent, emitEvent };
}