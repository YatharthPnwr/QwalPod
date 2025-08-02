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
  const deviceTypeToID = useRef<Map<string, string>>(new Map());
  const remoteDeviceTypeToId = useRef<Map<string, string>>(new Map());
  const [srcAudioStream, setSrcAudioStream] = useState<MediaStream | undefined>(
    undefined
  );
  const [srcVideoStream, setSrcVideoStream] = useState<MediaStream | undefined>(
    undefined
  );
  const [peerAudioStream, setPeerAudioStream] = useState<
    MediaStream | undefined
  >(undefined);
  const [peerVideoStream, setPeerVideoStream] = useState<
    MediaStream | undefined
  >(undefined);
  const [peerScreenShareAudioStream, setPeerScreenShareAudioStream] = useState<
    MediaStream | undefined
  >(undefined);
  const [peerScreenShareVideoStream, setPeerScreenShareVideoStream] = useState<
    MediaStream | undefined
  >(undefined);
  const hasInitialNegotiationCompleted = useRef<boolean>(false);

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
        // console.log(res.data);
      } else if (res.type === "success") {
        // console.log(res.data);
      } else if (res.type === "hostJoined") {
        // console.log(res.data);
      } else if (res.type === "participantJoined") {
        //Do all the logic of sending the data to the other participant,
        //WAIT FOR ALL THE PARTICIPANTS TO JOIN THE ROOM BEFORE SENDING THE DATA.
        if (userRole === "caller") {
          const config = {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          };
          const newPeerConnection = new RTCPeerConnection(config);
          peerConnection.current = newPeerConnection;

          await getUserMedia(
            newPeerConnection,
            setSrcAudioStream,
            setSrcVideoStream,
            deviceTypeToID
          );
          setPc(true);

          const sdpOfferSendAndCreate = async () => {
            if (!ws.current || !newPeerConnection) {
              return;
            }
            const res = await createSdpOffer(
              ws.current,
              localStorage.getItem("roomId") as string,
              newPeerConnection,
              deviceTypeToID.current
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
              setPeerAudioStream,
              setPeerVideoStream,
              setVideoOptions,
              setAudioInputOptions,
              setSrcAudioStream,
              setSrcVideoStream,
              peerVideoStream,
              peerAudioStream,
              peerScreenShareVideoStream,
              setPeerScreenShareVideoStream,
              peerScreenShareAudioStream,
              setPeerScreenShareAudioStream,
              hasInitialNegotiationCompleted,
              srcAudioStream,
              srcVideoStream,
              deviceTypeToID
            );
          };
          sdpOfferSendAndCreate();
          iceCandidateCreateAndSend();
        }
      } else if (res.type === "offer") {
        const remoteSdpOffer = res.data;
        // deviceTypeToID = new Map(Object.entries(res.data.streamMetaData));
        remoteDeviceTypeToId.current = new Map(
          Object.entries(res.streamMetaData as [string, string])
        );
        if (!ws.current) {
          return;
        }

        // Check if this is a renegotiation (existing connection) or new connection
        if (hasInitialNegotiationCompleted.current) {
          // This is a renegotiation (e.g., screen share)
          console.log("HANDLING RENEGOTIATION OFFEERRRRRR!!!!!!");
          if (!peerConnection.current) {
            console.log("NO PEER CONNECTION FOUND RETURNING");
            return;
          }

          try {
            // Set the remote description on the existing connection
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(remoteSdpOffer)
            );

            // Create and send answer
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);

            ws.current.send(
              JSON.stringify({
                event: "sendAnswer",
                data: {
                  roomId: localStorage.getItem("roomId"),
                  answer: answer,
                  streamMetaData: Object.fromEntries(deviceTypeToID.current),
                },
              })
            );
          } catch (error) {
            console.error("Error handling renegotiation:", error);
          }
        } else {
          // This is the initial connection setup
          console.log("Handling initial connection offer");
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
            setSrcAudioStream,
            setSrcVideoStream,
            setPeerAudioStream,
            setPeerVideoStream,
            setVideoOptions,
            setAudioInputOptions,
            peerVideoStream,
            peerAudioStream,
            peerScreenShareVideoStream,
            setPeerScreenShareVideoStream,
            peerScreenShareAudioStream,
            setPeerScreenShareAudioStream,
            hasInitialNegotiationCompleted,
            srcAudioStream,
            srcVideoStream,
            deviceTypeToID,
            remoteDeviceTypeToId
          );
          setPc(true);
        }
      } else if (res.type == "answer") {
        if (!peerConnection.current) {
          console.log("no peer connection found on the caller side.");
          return;
        }
        remoteDeviceTypeToId.current = new Map(
          Object.entries(res.streamMetaData as [string, string])
        );
        // Remove existing ontrack listener to avoid duplicates
        peerConnection.current.ontrack = null;
        peerConnection.current.ontrack = (event) => {
          const remoteStream = event.streams[0];
          const remoteStreamId = remoteStream.id;
          const remoteDeviceType =
            remoteDeviceTypeToId.current.get(remoteStreamId);

          if (remoteDeviceType === "peerAudio") {
            setPeerAudioStream(remoteStream);
          } else if (remoteDeviceType === "peerVideo") {
            setPeerVideoStream(remoteStream);
          } else if (remoteDeviceType === "peerScreenShare") {
            setPeerScreenShareVideoStream(remoteStream);
            setPeerScreenShareAudioStream(remoteStream);
          }
        };
        const remoteDesc = new RTCSessionDescription(res.data);

        if (!peerConnection.current) {
          return;
        }
        await peerConnection.current.setRemoteDescription(remoteDesc);
        hasInitialNegotiationCompleted.current = true;
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
    return () => {
      if (!peerConnection.current) {
        return;
      }
      peerConnection.current.onicecandidate = null;
      peerConnection.current.onconnectionstatechange = null;
      peerConnection.current.onnegotiationneeded = null;
      peerConnection.current.ontrack = null;
      navigator.mediaDevices.ondevicechange = null;
    };
  }, []);
  return (
    <>
      <div className="w-screen h-screen grid grid-rows-[75%_25%]">
        <div className="w-screen grid grid-cols-3 ">
          <div className="caller h-3/4 w-4/5 mx-auto my-auto rounded-2xl overflow-hidden">
            <video
              autoPlay
              playsInline
              muted
              ref={(video) => {
                if (video && srcVideoStream) {
                  video.srcObject = srcVideoStream;
                }
              }}
            ></video>
          </div>
          <div className="calee h-3/4 w-4/5 mx-auto my-auto rounded-2xl overflow-hidden">
            <video
              autoPlay
              playsInline
              muted
              ref={(video) => {
                if (video && peerVideoStream) {
                  video.srcObject = peerVideoStream;
                }
              }}
            ></video>
            <audio
              autoPlay
              ref={(audio) => {
                if (audio && peerAudioStream) {
                  audio.srcObject = peerAudioStream;
                }
              }}
            ></audio>
          </div>
          <div className="calee h-3/4 w-4/5 mx-auto my-auto rounded-2xl overflow-hidden">
            <video
              autoPlay
              playsInline
              muted
              ref={(video) => {
                if (video && peerScreenShareVideoStream) {
                  video.srcObject = peerScreenShareVideoStream;
                }
              }}
            ></video>
          </div>
        </div>
        <div className="w-screen">
          {peerConnection && pc && peerConnection.current && (
            <Controls
              audioInputOptions={audioInputOptions}
              setAudioInputOptions={setAudioInputOptions}
              setVideoOptions={setVideoOptions}
              videoOptions={videoOptions}
              peerConnection={peerConnection.current}
              srcVideoStream={srcVideoStream}
              setSrcVideoStream={setSrcVideoStream}
              srcAudioStream={srcAudioStream}
              setSrcAudioStream={setSrcAudioStream}
              deviceTypeToID={deviceTypeToID}
            />
          )}
        </div>
      </div>
    </>
  );
}
