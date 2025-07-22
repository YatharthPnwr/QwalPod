"use client";
import { useRef, useEffect, useState } from "react";
import { receiveCall } from "@/utils/functions/receiveCall";
import { createSdpOffer } from "@/utils/functions/sdpOffer";
import { iceCandidate } from "@/utils/functions/iceCandidate";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import { useParams } from "next/navigation";
import getUserMedia from "@/utils/functions/getDevicesAndMedia";
import Controls from "@/components/ui/Controls";
import { useApplicationContext } from "@/lib/context/ApplicationContext";

export default function PodSpacePage({ userRole }: { userRole: string }) {
  const { ws, setUserRole } = useApplicationContext();
  const peerConnection = useRef<RTCPeerConnection>(null);
  const [pc, setPc] = useState<boolean>(false);
  const params = useParams();

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
    if (!ws.current) {
      //Someone joined from the link
      ws.current = new WebSocket("ws://localhost:3000/api/ws");
    }
    const wsConnMan = new WebSocketConnHandle(ws.current, 1800);

    ws.current.onmessage = async (event) => {
      const res = JSON.parse(event.data.toString());
      if (res.type === "error") {
        console.log(res.data);
      } else if (res.type === "success") {
        console.log(res.data);
      } else if (res.type === "hostJoined") {
        console.log(res.data);
      } else if (res.type === "participantJoined") {
        console.log(res.data);
        //Do all the logic of sending the data to the other participant,
        //WAIT FOR ALL THE PARTICIPANTS TO JOIN THE ROOM BEFORE SENDING THE DATA.
        if (userRole === "caller") {
          console.log("initiating the sending data to other participant");
          const config = {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          };
          const newPeerConnection = new RTCPeerConnection(config);
          console.log("The new host RTC PEERCONNECTION is", newPeerConnection);
          peerConnection.current = newPeerConnection;

          await getUserMedia(
            newPeerConnection,
            setSrcAudioTrack,
            setSrcVideoTrack,
            setLocalStream
          );
          setPc(true);

          const sdpOfferSendAndCreate = async () => {
            if (!ws.current || !newPeerConnection) {
              return;
            }
            const res = await createSdpOffer(
              ws.current,
              localStorage.getItem("roomId") as string,
              newPeerConnection
            );
            return res;
          };
          const iceCandidateCreateAndSend = async () => {
            if (!ws.current || !newPeerConnection) {
              return;
            }
            iceCandidate(
              ws.current,
              localStorage.getItem("roomId") as string,
              newPeerConnection,
              setPeerAudioTrack,
              setPeerVideoTrack,
              setVideoOptions,
              setAudioInputOptions,
              setSrcAudioTrack,
              setSrcVideoTrack,
              localStream,
              setLocalStream
            );
          };
          sdpOfferSendAndCreate();
          iceCandidateCreateAndSend();
        }
      } else if (res.type === "offer" && userRole === "calee") {
        const remoteSdpOffer = res.data;
        if (!ws.current) {
          return;
        }
        const config = {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        };
        const newPeerConnection = new RTCPeerConnection(config);
        peerConnection.current = newPeerConnection;

        await receiveCall(
          ws.current,
          localStorage.getItem("roomId") as string,
          remoteSdpOffer,
          newPeerConnection,
          setSrcAudioTrack,
          setSrcVideoTrack,
          setPeerAudioTrack,
          setPeerVideoTrack,
          setLocalStream,
          setVideoOptions,
          setAudioInputOptions,
          localStream
        );
        setPc(true);
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
    if (!userRole) {
      console.log("REACHED HERE");
      setUserRole("calee");
      const { roomId } = params;
      wsConnMan.waitForConnection(() => {
        ws.current?.send(
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
    if (userRole === "caller") {
      //Join the room as a host.
      wsConnMan.waitForConnection(() => {
        ws.current?.send(
          JSON.stringify({
            event: "hostJoin",
            data: {
              roomId: localStorage.getItem("roomId"),
              userId: localStorage.getItem("userId"),
            },
          })
        );
      });
    } else if (userRole == "calee") {
      //join the room as a participant
      const { roomId } = params;
      wsConnMan.waitForConnection(() => {
        ws.current?.send(
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
  }, []);
  return (
    <>
      <div className="w-screen h-screen grid grid-rows-[75%_25%]">
        <div className="w-screen grid grid-cols-2 ">
          <div className="caller h-3/4 w-4/5 mx-auto my-auto rounded-2xl overflow-hidden">
            <video
              autoPlay
              playsInline
              muted
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
              muted
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
