import http from "http";
import app from "./app.js";
import { Server } from "socket.io";

const server = http.createServer(app);

const PORT = process.env.PORT;

server.listen(PORT, () => {
    console.log(`server listening on: http://localhost:${PORT}/api`);
});

export default server;
