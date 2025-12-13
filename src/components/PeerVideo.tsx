import { useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import { createPortal } from "react-dom";

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
      {streams.peerScreenShareVideoStream &&
        createPortal(
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
            <Rnd
              className="pointer-events-auto"
              default={{
                x: window.innerWidth / 2 - window.innerWidth * 0.4,
                y: window.innerHeight / 2 - window.innerHeight * 0.3,
                width: window.innerWidth * 0.8,
                height: window.innerHeight * 0.6,
              }}
              bounds="window"
              minWidth={300}
              minHeight={200}
            >
              <video
                className="w-full h-full border-2 border-white rounded-lg shadow-lg object-contain bg-black"
                autoPlay
                playsInline
                muted
                ref={peerScreenShareVideoRef}
              ></video>
            </Rnd>
          </div>,
          document.body
        )}

      {/* Peer screen share audio */}
      {streams.peerScreenShareAudioStream && (
        <audio autoPlay ref={peerScreenShareAudioRef}></audio>
      )}
    </div>
  );
}
