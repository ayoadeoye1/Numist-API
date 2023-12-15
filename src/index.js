import http from "http";
import app from "./app.js";
import socketChat from "./socket/socketChat.js";
import { Server } from "socket.io";

const server = http.createServer(app);

const PORT = process.env.PORT;

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

global.io = io;

await socketChat(io);

server.listen(PORT, () => {
    console.log(`server listening on: http://localhost:${PORT}/api`);
});

export default server;
