import { useEffect, useRef } from "react";

interface peerStreamInfo {
  peerAudioStream: MediaStream | null;
  peerVideoStream: MediaStream | null;
  peerScreenShareAudioStream: MediaStream | null;
  peerScreenShareVideoStream: MediaStream | null;
}
export default function PeerVideo({
  streams,
  to,
}: {
  streams: peerStreamInfo;
  to: string;
}) {
  const peerVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerScreenShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerScreenShareAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    //Use effect to update the video
    if (peerVideoRef.current) {
      peerVideoRef.current.srcObject = streams.peerVideoStream;
    }
  }, [streams.peerVideoStream, to]);

  //Use effect to update the audio
  useEffect(() => {
    if (peerAudioRef.current) {
      peerAudioRef.current.srcObject = streams.peerAudioStream;
    }
  }, [streams.peerAudioStream, to]);

  //Use effect to update the screen share video
  useEffect(() => {
    if (peerScreenShareVideoRef.current) {
      peerScreenShareVideoRef.current.srcObject =
        streams.peerScreenShareVideoStream;
    }
  }, [streams.peerScreenShareVideoStream, to]);

  //Use effect to update the screen share audio
  useEffect(() => {
    if (peerScreenShareAudioRef.current) {
      peerScreenShareAudioRef.current.srcObject =
        streams.peerScreenShareAudioStream;
    }
  }, [streams.peerScreenShareAudioStream, to]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black flex items-center justify-center">
      {/* Peer video */}
      <video
        ref={peerVideoRef}
        className="w-full h-full"
        autoPlay
        playsInline
        muted
      />
      {/* Peer Audio */}
      <audio autoPlay ref={peerAudioRef}></audio>

      {/* Peer screen share video */}
      {streams.peerScreenShareVideoStream && (
        <video
          className="absolute top-2 right-2 w-40 h-24 border-2 border-white rounded-lg shadow-lg"
          autoPlay
          playsInline
          muted
          ref={peerScreenShareVideoRef}
        ></video>
      )}

      {/* Peer screen share audio */}
      {streams.peerScreenShareAudioStream && (
        <audio autoPlay ref={peerScreenShareAudioRef}></audio>
      )}
    </div>
  );
}
