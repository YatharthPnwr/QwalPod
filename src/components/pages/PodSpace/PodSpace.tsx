"use client";
import { useRef, useEffect } from "react";
import { receiveCall } from "@/utils/functions/receiveCall";
import { createSdpOffer } from "@/utils/functions/sdpOffer";
import { iceCandidate } from "@/utils/functions/iceCandidate";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import { useSearchParams } from "next/navigation";
import getUserMedia from "@/utils/functions/getDevicesAndMedia";

export default function PodSpacePage({ userRole }: { userRole: string }) {
  const webSocket = useRef<WebSocket>(null);
  const peerConnection = useRef<RTCPeerConnection>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    webSocket.current = new WebSocket("ws://localhost:3000/api/ws");
    if (!webSocket.current) {
      console.log("No websocket found returning");
      return;
    }
    const wsConnMan = new WebSocketConnHandle(webSocket.current, 1800);

    webSocket.current.onmessage = async (event) => {
      const res = JSON.parse(event.data.toString());
      console.log(res);
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
          peerConnection.current = new RTCPeerConnection(config);
          console.log("Peer connection is ", peerConnection.current);

          await getUserMedia(peerConnection.current);

          const sdpOfferSendAndCreate = async () => {
            if (!webSocket.current || !peerConnection.current) {
              return;
            }
            const res = await createSdpOffer(
              webSocket.current,
              localStorage.getItem("roomId") as string,
              peerConnection.current
            );
            return res;
          };
          const iceCandidateCreateAndSend = async () => {
            if (!webSocket.current || !peerConnection.current) {
              return;
            }
            iceCandidate(
              webSocket.current,
              localStorage.getItem("roomId") as string,
              peerConnection.current
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
        peerConnection.current = await receiveCall(
          webSocket.current,
          localStorage.getItem("roomId") as string,
          remoteSdpOffer
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
      // Wait for the reply, after the reply is recieved, set
      // set the id of the new room in localstorage,
      //  then join that room.
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
  }, []);

  return (
    <>
      <div>Hello</div>
    </>
  );
}
