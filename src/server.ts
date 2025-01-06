// server.ts
// This file is the entry point for server code. A lot of this is vestigal but we will need this again

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { ethers } from "ethers";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: "/api/socketio",
  });


  io.on("connection", (socket) => {
    
    socket.on("disconnect", () => {
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    // Handle betCancelled event from client
    socket.on("betCancelled", ({ betAddress }) => {
      // You might want to perform additional actions here
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {

  });
});