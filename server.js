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
  initializeWorker,
  initializeRTPCapabilities,
  initializeRouter,
  initializeWebRTCServer,
  initializeTransport,
  initializeProducer,
  initializeConsumer,
} = require("./mediasoup");

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
    await collection.insertOne(await room);
  } catch (err) {
    console.log(err);
    throw err;
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
    throw err;
  } finally {
    if (client) {
      await client.close();
    }
  }
  return await currentRoom;
};

// Mediasoup methods
let webRtcServer;
let Routers = [];

const worker = initializeWorker().then((worker) => {
  webRtcServer = initializeWebRTCServer(worker);
  return worker;
});

// Room Socket Connections
io.on("connection", (socket) => {
  socket.on("client-connected", async (message) => {
    const participant = {
      clientType: message.clientType,
      clientId: message.clientId,
      clientName: message.clientName,
    };

    socket.join(message.roomId);

    if (!message.roomName) {
      const getRoom = async () => {
        const room = await addParticipant(message.roomId, participant);
        const { router } = await Routers.find(
          (router) => router.id == message.roomId
        );

        console.log(
          (await room.value.rtpCapabilities) === router.rtpCapabilities
            ? "yes"
            : "no"
        );

        await transportMethod(
          socket,
          router,
          participant,
          await room.value.rtpCapabilities,
          message.roomId,
          await room.value.roomName
        );
      };
      getRoom();
    } else if (message.roomName) {
      const router = await initializeRouter(await worker);
      const room = {
        roomId: message.roomId,
        roomName: message.roomName,
        participants: [participant],
        rtpCapabilities: await router.rtpCapabilities,
      };

      Routers.push({
        id: room.roomId,
        router,
      });

      console.log(room.rtpCapabilities);

      await transportMethod(
        socket,
        router,
        participant,
        room.rtpCapabilities,
        message.roomId
      );

      addRoom(room);
    }

    socket.broadcast.to(message.roomId).emit("user-connected", {
      message: `user ${message.clientId} username:${message.clientName} has joined the room`,
      offer: message.offer,
    });
  });
});

// Mediasoup media server
const transportMethod = async (
  socket,
  router,
  participant,
  rtpCapabilities,
  roomId,
  roomName
) => {
  const sndTransport = await initializeTransport(
    await router,
    await webRtcServer
  );
  const rcvTransport = await initializeTransport(
    await router,
    await webRtcServer
  );

  io.to(participant.clientId).emit("setup-info", {
    roomName: roomName,
    rtpCapabilities: rtpCapabilities,
    sndTransport: sndTransport.id,
    sndTransportIceParameters: sndTransport.iceParameters,
    sndTransportIceCandidates: sndTransport.iceCandidates,
    sndTransportDtlsParameters: sndTransport.dtlsParameters,
    rcvTransport: rcvTransport.id,
    rcvTransportIceParameters: rcvTransport.iceParameters,
    rcvTransportIceCandidates: rcvTransport.iceCandidates,
    rcvTransportDtlsParameters: rcvTransport.dtlsParameters,
  });

  socket.on("snd-parameters", (message) => {
    sndTransport.connect({ dtlsParameters: message.parameters });
  });

  socket.on("rcv-parameters", (message) => {
    rcvTransport.connect({ dtlsParameters: message.parameters });
  });

  socket.on("video-producer-parameters", async (message) => {
    const videoProducer = initializeProducer(
      sndTransport,
      message.rtpParameters
    );

    const videoConsumer = initializeConsumer(
      await rcvTransport,
      await (
        await videoProducer
      ).producer,
      await initializeRTPCapabilities(),
      router
    );

    const consumerInfo = {
      id: await (await videoConsumer).id,
      producerId: await (await videoProducer).id,
      kind: "video",
      rtpParameters: await (await videoConsumer).rtpParameters,
    };

    await socket.broadcast.to(roomId).emit("new-consumer", consumerInfo);
  });
};

app.get("/", (req, res) => {
  res.send("whatup");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
