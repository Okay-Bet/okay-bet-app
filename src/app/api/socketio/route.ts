// api/socketio/route.ts
// api for setting up websockets, not very functional right now

import { NextRequest, NextResponse } from "next/server";
import { Server as ServerIO } from "socket.io";
import { createServer } from "http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Declare a variable to hold our socket instance
let io: ServerIO | null = null;

// Declare a variable to hold our http server instance
let httpServer: any = null;

export async function GET(req: NextRequest) {
  if (io) {
    return NextResponse.json(
      { message: "Socket is already running" },
      { status: 200 }
    );
  }

  // Only create a new http server if one doesn't exist
  if (!httpServer) {
    httpServer = createServer();
  }

  // Initialize the socket
  io = new ServerIO(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: "*", // In production, replace with your actual origin
    },
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", (reason) => {
    });
  });

  // Only start listening if the server isn't already listening
  if (!httpServer.listening) {
    httpServer.listen(3001, () => {
    });
  }

  return NextResponse.json({ message: "Socket initialized" }, { status: 200 });
}
