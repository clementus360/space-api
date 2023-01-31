// Mediasoup Initialisation
const mediasoup = require("mediasoup");

const mediaCodecs = [
  {
    mimeType: "audio/opus",
    kind: "audio",
    preferredPayloadType: 100,
    clockRate: 48000,
    channels: 2,
    parameters: { minptime: 10, useinbandfec: 1 },
    rtcpFeedback: [{ type: "transport-cc", parameter: "" }],
  },
  {
    mimeType: "video/H264",
    kind: "video",
    preferredPayloadType: 101,
    clockRate: 90000,
    parameters: {
      "level-asymmetry-allowed": 1,
      "packetization-mode": 0,
      "profile-level-id": "42e01f",
    },
    rtcpFeedback: [
      { type: "goog-remb", parameter: "" },
      { type: "transport-cc", parameter: "" },
      { type: "ccm", parameter: "fir" },
      { type: "nack", parameter: "" },
      { type: "nack", parameter: "pli" },
    ],
  },
];

const initializeWorker = async () => {
  return await mediasoup.createWorker();
};

const initializeRTPCapabilities = async () => {
  const rtpCapabilities = mediasoup.getSupportedRtpCapabilities();
  return rtpCapabilities;
};

const initializeRouter = async (worker) => {
  const router = await worker.createRouter({ mediaCodecs });
  return router;
};

const initializeWebRTCServer = async (worker) => {
  return await worker.createWebRtcServer({
    listenInfos: [
      {
        protocol: "udp",
        ip: "0.0.0.0",
        port: 20000,
      },
      {
        protocol: "tcp",
        ip: "0.0.0.0",
        port: 20000,
      },
    ],
  });
};

const initializeTransport = async (router, webRtcServer) => {
  const transport = await router.createWebRtcTransport({
    webRtcServer: webRtcServer,
    // listenIps: [{ ip: "192.168.0.111", announcedIp: "88.12.10.41" }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  return transport;
};

const initializeProducer = async (transport, rtpParameters) => {
  const producer = await transport.produce({
    kind: "video",
    rtpParameters: rtpParameters,
  });

  return {
    id: await producer.id,
    producer,
  };
};

const initializeConsumer = async (
  transport,
  producer,
  rtpCapabilities,
  router
) => {
  if (router.canConsume({ producerId: producer.id, rtpCapabilities })) {
    const consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities: rtpCapabilities,
    });

    return await {
      id: consumer.id,
      rtpParameters: consumer.rtpParameters,
      consumer,
    };
  }
};

module.exports = {
  mediaCodecs,
  initializeWorker,
  initializeRTPCapabilities,
  initializeRouter,
  initializeWebRTCServer,
  initializeTransport,
  initializeProducer,
  initializeConsumer,
};
