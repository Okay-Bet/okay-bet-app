import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

export default function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    console.log('useEffect in useWebSocket hook is running');

    const initSocket = async () => {
      if (!socketRef.current) {
        console.log('Initializing socket');
        
        // First, call the API route to ensure the server-side socket is initialized
        await fetch('/api/socketio');
        
        console.log('Creating new socket connection');
        socketRef.current = io('http://localhost:3001', {
          path: '/api/socketio',
          transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
          console.log('Socket connected successfully', socketRef.current?.id);
          setIsConnected(true);
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('Socket disconnected', reason);
          setIsConnected(false);
        });

        socketRef.current.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
          setIsConnected(false);
        });

        socketRef.current.on('contractEvent', (data: any) => {
          console.log('Received contract event:', data);
          setLastEvent(data);
        });
      }
    };

    initSocket();

    return () => {
      console.log('Cleaning up socket...');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return { isConnected, lastEvent };
}
