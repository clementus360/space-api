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
    const participant = {
      clientType: message.clientType,
      clientId: message.clientId,
      clientName: message.clientName,
    };

    client.connect(async (err) => {
      const collection = client.db("Spacechat").collection("Rooms");
      console.log(collection);

      if (!message.clientName) {
        console.log("nope");
      } else if (message.clientName) {
        const addRoom = await collection
          .insertOne({
            roomId: message.roomId,
            roomName: message.roomName,
            participants: [participant],
          })
          .catch((err) => console.log(err));
      }
      client.close();
    });

    if (!message.roomName) {
      socket.to(message.roomId).emit("room-name", message.roomName);
    }

    console.log(message);
    socket.join(message.roomId);
    socket.broadcast
      .to(message.roomId)
      .emit(
        "user-connected",
        `user ${message.clientId} username:${message.clientName} has joined the room`
      );
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
