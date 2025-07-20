"use client";
import { useRef, useEffect, useState } from "react";
import { receiveCall } from "@/utils/functions/receiveCall";
import { createSdpOffer } from "@/utils/functions/sdpOffer";
import { iceCandidate } from "@/utils/functions/iceCandidate";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import { useSearchParams } from "next/navigation";
import getUserMedia from "@/utils/functions/getDevicesAndMedia";
import Controls from "@/components/ui/Controls";
import { updateMediaStream } from "@/utils/functions/getDevicesAndMedia";

export default function PodSpacePage({ userRole }: { userRole: string }) {
  const webSocket = useRef<WebSocket>(null);
  const peerConnection = useRef<RTCPeerConnection>(null);
  const searchParams = useSearchParams();
  const [pc, setPc] = useState<boolean>(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [srcAudioTrack, setSrcAudioTrack] = useState<MediaStream | undefined>(
    undefined
  );
  const [srcVideoTrack, setSrcVideoTrack] = useState<MediaStream | undefined>(
    undefined
  );
  const [peerAudioTrack, setPeerAudioTrack] = useState<MediaStream | undefined>(
    undefined
  );
  const [peerVideoTrack, setPeerVideoTrack] = useState<MediaStream | undefined>(
    undefined
  );
  const [audioInputOptions, setAudioInputOptions] =
    useState<MediaDeviceInfo[]>();

  const [videoOptions, setVideoOptions] = useState<MediaDeviceInfo[]>();

  useEffect(() => {
    webSocket.current = new WebSocket("ws://localhost:3000/api/ws");
    if (!webSocket.current) {
      console.log("No websocket found returning");
      return;
    }
    const wsConnMan = new WebSocketConnHandle(webSocket.current, 1800);

    webSocket.current.onmessage = async (event) => {
      const res = JSON.parse(event.data.toString());
      if (res.type === "error") {
        console.log(res.data);
      } else if (res.type === "success") {
        console.log(res.data);
      } else if (res.type == "clientIdGenerated") {
        const clientId = res.data;
        //set the client id in the localstorage.
        localStorage.setItem("userId", clientId);
      } else if (res.type === "roomCreated") {
        const roomId = res.data;
        //set the room id in the localstorage.
        localStorage.setItem("roomId", roomId);
        console.log("The room id is", roomId);
        //join that particular room.
        if (!webSocket.current) {
          return;
        }
        wsConnMan.waitForConnection(() => {
          webSocket.current?.send(
            JSON.stringify({
              event: "hostJoin",
              data: {
                roomId: localStorage.getItem("roomId"),
                userId: localStorage.getItem("userId"),
              },
            })
          );
        });
      } else if (res.type === "hostJoined") {
        console.log(res.data);
      } else if (res.type === "participantJoined") {
        console.log(res.data);
        //Do all the logic of sending the data to the other participant,

        if (userRole === "caller") {
          console.log("initiating the sending data to other participant");
          const config = {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          };
          const newPeerConnection = new RTCPeerConnection(config);
          console.log("The new host RTC PEERCONNECTION is", newPeerConnection);
          peerConnection.current = newPeerConnection;
          setPc(true);
          await getUserMedia(
            newPeerConnection,
            setSrcAudioTrack,
            setSrcVideoTrack,
            setLocalStream
          );

          const sdpOfferSendAndCreate = async () => {
            if (!webSocket.current || !newPeerConnection) {
              return;
            }
            const res = await createSdpOffer(
              webSocket.current,
              localStorage.getItem("roomId") as string,
              newPeerConnection
            );
            return res;
          };
          const iceCandidateCreateAndSend = async () => {
            if (!webSocket.current || !newPeerConnection) {
              return;
            }
            iceCandidate(
              webSocket.current,
              localStorage.getItem("roomId") as string,
              newPeerConnection,
              setPeerAudioTrack,
              setPeerVideoTrack
            );
          };
          sdpOfferSendAndCreate();
          iceCandidateCreateAndSend();
        }
      } else if (res.type === "offer" && userRole === "calee") {
        const remoteSdpOffer = res.data;
        if (!webSocket.current) {
          return;
        }
        const config = {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        };
        const newPeerConnection = new RTCPeerConnection(config);
        peerConnection.current = newPeerConnection;
        setPc(true);
        await receiveCall(
          webSocket.current,
          localStorage.getItem("roomId") as string,
          remoteSdpOffer,
          newPeerConnection,
          setSrcAudioTrack,
          setSrcVideoTrack,
          setPeerAudioTrack,
          setPeerVideoTrack,
          setLocalStream
        );
      } else if (res.type == "answer" && userRole === "caller") {
        const remoteDesc = new RTCSessionDescription(res.data);
        if (!peerConnection.current) {
          return;
        }
        await peerConnection.current.setRemoteDescription(remoteDesc);
      } else if (res.type == "iceCandidate") {
        const remoteIceCandidate = res.data;
        if (!peerConnection.current) {
          return;
        }
        if (remoteIceCandidate) {
          try {
            await peerConnection.current.addIceCandidate(remoteIceCandidate);
          } catch (e) {
            console.log(e);
          }
        }
      }
    };

    if (userRole === "caller") {
      //create  a new room,
      wsConnMan.waitForConnection(() => {
        if (!webSocket.current) {
          return;
        }
        webSocket.current.send(
          JSON.stringify({
            event: "createNewRoom",
          })
        );
      });
    } else if (userRole == "calee") {
      const roomId = searchParams.get("roomId");
      wsConnMan.waitForConnection(() => {
        webSocket.current?.send(
          JSON.stringify({
            event: "joinRoom",
            data: {
              roomId: roomId,
              userId: localStorage.getItem("userId"),
            },
          })
        );
      });
    }
    if (navigator.mediaDevices && peerConnection.current != null) {
      navigator.mediaDevices.ondevicechange = async () => {
        await updateMediaStream({
          setVideoOptions,
          setAudioInputOptions,
          setSrcAudioTrack,
          setSrcVideoTrack,
        });
        //Remove the current tracks
        if (localStream && pc && peerConnection.current) {
          localStream.getTracks().forEach((track) => {
            const sender = peerConnection
              .current!.getSenders()
              .find((s) => s.track === track);
            if (sender) {
              peerConnection.current!.removeTrack(sender);
            }
          });
        }
        //add the new tracks
        if (pc && peerConnection.current) {
          await getUserMedia(
            peerConnection.current,
            setSrcAudioTrack,
            setSrcVideoTrack,
            setLocalStream
          );
        }
      };
    }
  }, []);

  return (
    <>
      <div className="w-screen h-screen grid grid-rows-[75%_25%]">
        <div className="w-screen grid grid-cols-2 ">
          <div className="caller h-3/4 w-4/5 mx-auto my-auto rounded-2xl overflow-hidden">
            <video
              autoPlay
              playsInline
              ref={(video) => {
                if (video && srcVideoTrack) {
                  video.srcObject = srcVideoTrack;
                }
              }}
            ></video>
            {/* <audio
              autoPlay
              ref={(audio) => {
                if (audio && srcAudioTrack) {
                  audio.srcObject = srcAudioTrack;
                }
              }}
            ></audio> */}
          </div>
          <div className="calee h-3/4 w-4/5 mx-auto my-auto rounded-2xl overflow-hidden">
            <video
              autoPlay
              playsInline
              ref={(video) => {
                if (video && peerVideoTrack) {
                  video.srcObject = peerVideoTrack;
                }
              }}
            ></video>
            <audio
              autoPlay
              ref={(audio) => {
                if (audio && peerAudioTrack) {
                  audio.srcObject = peerAudioTrack;
                }
              }}
            ></audio>
          </div>
        </div>
        <div className="w-screen">
          {peerConnection && pc && peerConnection.current && (
            <Controls
              audioInputOptions={audioInputOptions}
              setAudioInputOptions={setAudioInputOptions}
              setVideoOptions={setVideoOptions}
              videoOptions={videoOptions}
              localStream={localStream}
              setLocalStream={setLocalStream}
              peerConnection={peerConnection.current}
              srcVideoTrack={srcVideoTrack}
              setSrcVideoTrack={setSrcVideoTrack}
              srcAudioTrack={srcAudioTrack}
              setSrcAudioTrack={setSrcAudioTrack}
            />
          )}
        </div>
      </div>
    </>
  );
}
