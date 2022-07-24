const express = require("express");
const { createServer } = require("http");
const { Socket } = require("socket.io");
const app = express();
const server = createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("client-connected", (message) => {
    // const client = message.clientId;
    // const room = message.roomId;
    const connection = {
      roomId: message.roomId,
      roomName: message.roomName,
      clientType: message.clientType,
      clientId: message.clientId,
      clientName: message.clientName,
    };
    console.log(connection);
    socket.join(connection.roomId);
    socket.broadcast
      .to(connection.roomId)
      .emit(
        "user-connected",
        `user ${connection.clientId} username:${connection.clientName} has joined the room`
      );
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
