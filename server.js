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

const {
  types,
  version,
  observer,
  createWorker,
  createRouter,
  getSupportedRtpCapabilities,
  parseScalabilityMode,
} = require("mediasoup");

// Connecting to MongoDB
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.DB_URL;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Room DB methods
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

console;

// Room Socket Connections
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
  soup(socket);
});

// Mediasoup media server
const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
  },
];

const wrtcConfig = {
  listenInfos: [
    {
      protocol: "udp",
      ip: "127.0.0.1",
      port: 3002,
    },
    {
      protocol: "tcp",
      ip: "127.0.0.1",
      port: 3003,
    },
  ],
};

async function soup(socket) {
  const worker = await createWorker();
  const router = await worker.createRouter({ mediaCodecs });
  socket.broadcast.emit("rtp-capabilities", router.rtpCapabilities);
  const webRtcServer = await worker.createWebRtcServer(wrtcConfig);

  const transport = await router.createWebRtcTransport({
    webRtcServer: webRtcServer,
    listenIps: [{ ip: "192.168.0.111", announcedIp: "88.12.10.41" }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  console.log(transport);
}

app.get("/", (req, res) => {
  res.send("whatup");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
