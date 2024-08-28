import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { ethers } from "ethers";
import betABI from "./constants/betABI.json";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log("Next.js app prepared");
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: "/api/socketio",
  });

  console.log("Socket.IO server created");

  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    // Handle betCancelled event from client
    socket.on("betCancelled", ({ betAddress }) => {
      console.log(`Bet cancellation initiated for address: ${betAddress}`);
      // You might want to perform additional actions here
    });
  });

  // Setup contract event listener
  const provider = new ethers.providers.WebSocketProvider(
    process.env.ALCHEMY_BASE_WSS!
  );

  const contract = new ethers.Contract(
    "0xA32DbbA5427fEE87D3CC6CbF85Cd42A75E2F413C",
    betABI,
    provider
  );

  contract.on("*", (event) => {
    console.log("Contract event:", event);
    io.emit("contractEvent", {
      type: event.event,
      data: event.args,
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});