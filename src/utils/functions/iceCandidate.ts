interface sendIceCandidateProps {
  sender: WebSocket;
  roomId: string;
  peerConnection: RTCPeerConnection;
  fromId: string;
  toId: string;
}

export function iceCandidate(props: sendIceCandidateProps) {
  //listen for local ICE candidate.
  props.peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      //Send the local ICE candidate to all the peers in the space.
      props.sender.send(
        JSON.stringify({
          event: "trickleIce",
          data: {
            roomId: props.roomId,
            iceCandidate: event.candidate,
            fromId: props.fromId,
            toId: props.toId,
          },
        })
      );
    }
  };
}
