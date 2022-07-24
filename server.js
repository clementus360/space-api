require("dotenv").config();
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
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.DB_URL;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

io.on("connection", (socket) => {
  socket.on("client-connected", (message) => {
    const connection = {
      roomId: message.roomId,
      roomName: message.roomName,
      clientType: message.clientType,
      clientId: message.clientId,
      clientName: message.clientName,
    };

    client.connect(async (err) => {
      const collection = client.db("Spacechat").collection("Rooms");
      const participant = {
        clientType: message.clientType,
        clientId: message.clientId,
        clientName: message.clientName,
      };
      const addRoom = await collection.insertOne({
        roomId: message.roomId,
        roomName: message.roomName,
        participants: participants.push(participant),
      });
      client.close();
    });

    if (!connection.roomName) {
      socket.to(connection.roomId).emit("room-name", connection.roomName);
    }

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
