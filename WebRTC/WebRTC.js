const DefaultRTCPeerConnection = require("wrtc").RTCPeerConnection;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

options = {
  RTCPeerConnection: DefaultRTCPeerConnection,
};

const { RTCPeerConnection } = options;
const peerConnection = new RTCPeerConnection(config);

const createOffer = async () => {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  return offer;
};

module.exports = createOffer;
