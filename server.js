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

const addRoom = async (room) => {
  try {
    await client.connect();
    const collection = client.db("Cluster0").collection("Rooms");
    await collection.insertOne(room);
  } catch (err) {
    console.log(err);
  } finally {
    if (client) {
      await client.close();
    }
  }
};

const addParticipant = async (roomId, participant) => {
  let currentRoom;
  try {
    await client.connect();
    const collection = client.db("Cluster0").collection("Rooms");
    currentRoom = await collection.findOneAndUpdate(
      { roomId: roomId },
      { $push: { participants: participant } }
    );
  } catch (err) {
    console.log(err);
  } finally {
    if (client) {
      await client.close();
    }
  }
  return await currentRoom;
};

io.on("connection", (socket) => {
  socket.on("client-connected", (message) => {
    const participant = {
      clientType: message.clientType,
      clientId: message.clientId,
      clientName: message.clientName,
    };

    if (!message.roomName) {
      const getRoom = async () =>
        await addParticipant(message.roomId, participant);
      console.log(getRoom);
      socket.to(getRoom.roomId).emit("room-name", getRoom.roomName);
      console.log("nope");
    } else if (message.roomName) {
      const room = {
        roomId: message.roomId,
        roomName: message.roomName,
        participants: [participant],
      };
      addRoom(room);
    }

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
