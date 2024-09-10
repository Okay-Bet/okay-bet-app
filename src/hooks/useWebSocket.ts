import { useState, useEffect, useCallback } from "react";
import io, { Socket } from "socket.io-client";

let socket: Socket | null = null;

export default function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);

  const initSocket = useCallback(() => {
    if (!socket) {
      const socketUrl =
        process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3000";
      socket = io(socketUrl, {
        path: "/api/socketio",
        transports: ["websocket"],
        autoConnect: false, // Prevent auto-connection
      });
    }

    if (!socket.connected) {
      socket.connect(); // Explicitly connect
    }

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onContractEvent = (data: any) => {
      setLastEvent(data);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("contractEvent", onContractEvent);

    // If socket is already connected, set isConnected to true
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket?.off("connect", onConnect);
      socket?.off("disconnect", onDisconnect);
      socket?.off("contractEvent", onContractEvent);
    };
  }, []);

  useEffect(() => {
    const cleanup = initSocket();
    return () => {
      cleanup();
      // We don't disconnect the socket here to keep it alive for other components
    };
  }, [initSocket]);

  const emitEvent = useCallback((eventName: string, data?: any) => {
    if (socket && socket.connected) {
      socket.emit(eventName, data);
    } else {
      console.error("Socket is not connected");
    }
  }, []);

  return { isConnected, lastEvent, emitEvent };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
