import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { ethers } from 'ethers';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);

  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  // Setup contract event listener
  const provider = new ethers.providers.WebSocketProvider(process.env.ETHEREUM_WEBSOCKET_URL!);
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS!,
    process.env.CONTRACT_ABI!,
    provider
  );

  contract.on("*", (event) => {
    console.log('Contract event:', event);
    io.emit('contractEvent', {
      type: event.event,
      data: event.args
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
