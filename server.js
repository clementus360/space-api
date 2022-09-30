require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { Socket } = require("socket.io");
const app = express();
const server = createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://127.0.0.1:3000",
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
    console.log(message.offer);

    socket.join(message.roomId);

    if (!message.roomName) {
      const getRoom = async () => {
        const room = await addParticipant(message.roomId, participant);
        io.to(participant.clientId).emit("room-name", room.value.roomName);
      };
      getRoom();
    } else if (message.roomName) {
      const room = {
        roomId: message.roomId,
        roomName: message.roomName,
        participants: [participant],
      };
      addRoom(room);
    }
    socket.broadcast.to(message.roomId).emit("user-connected", {
      message: `user ${message.clientId} username:${message.clientName} has joined the room`,
      offer: message.offer,
    });
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
