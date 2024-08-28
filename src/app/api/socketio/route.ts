import { NextRequest, NextResponse } from 'next/server';
import { Server as ServerIO } from 'socket.io';
import { createServer } from 'http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

let io: ServerIO;

const httpServer = createServer();

export async function GET(req: NextRequest) {
  if (io) {
    console.log('Socket is already running');
    return NextResponse.json({ message: 'Socket is already running' }, { status: 200 });
  }

  console.log('Socket is initializing');
  
  io = new ServerIO(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);
    socket.on('disconnect', (reason) => {
      console.log('Client disconnected', socket.id, reason);
    });
  });

  httpServer.listen(3001, () => {
    console.log('Socket.IO server is running on port 3001');
  });

  console.log('Socket initialized');
  return NextResponse.json({ message: 'Socket initialized' }, { status: 200 });
}