"use client";
import { useRef, useEffect } from "react";
import { receiveCall } from "@/utils/functions/receiveCall";
import { createSdpOffer } from "@/utils/functions/sdpOffer";
import { iceCandidate } from "@/utils/functions/iceCandidate";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import { useSearchParams } from "next/navigation";

export default function PodSpacePage({ userRole }: { userRole: string }) {
  const webSocket = useRef<WebSocket>(null);
  const peerConnection = useRef<RTCPeerConnection>(null);
  const searchParams = useSearchParams();
  console.log("The userrole reaching the PodSpacePage is ", userRole);

  useEffect(() => {
    webSocket.current = new WebSocket("ws://localhost:3000/api/ws");
    if (!webSocket.current) {
      console.log("No websocket found returning");
      return;
    }
    const wsConnMan = new WebSocketConnHandle(webSocket.current, 1000);

    webSocket.current.onmessage = async (event) => {
      const res = JSON.parse(event.data.toString());
      console.log(res);
      if (res.type === "error") {
        console.log(res.data);
      } else if (res.type === "success") {
        console.log(res.data);
      } else if (res.type == "clientIdGenerated") {
        const clientId = res.data;
        console.log("The clientId is, ", clientId);
        //set the client id in the localstorage.
        localStorage.setItem("userId", clientId);
      } else if (res.type === "roomCreated") {
        const roomId = res.data;
        console.log("The room was created, the id of the room is", roomId);
        //set the room id in the localstorage.
        localStorage.setItem("roomId", roomId);
        //join that particular room.
        if (!webSocket.current) {
          return;
        }
        webSocket.current.send(
          JSON.stringify({
            event: "joinRoom",
            data: {
              roomId: localStorage.getItem("roomId"),
              userId: localStorage.getItem("userId"),
            },
          })
        );
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
        const remoteIceCandidate = res.iceCandidate;
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
            data: localStorage.getItem("userId"),
          })
        );
      });
      // Wait for the reply, after the reply is recieved, set
      // set the id of the new room in localstorage,
      //  then join that room.
      const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
      peerConnection.current = new RTCPeerConnection(config);
      const sdpOfferSendAndCreate = async () => {
        if (!webSocket.current || !peerConnection.current) {
          return;
        }
        const res = await createSdpOffer(
          webSocket.current,
          localStorage.getItem("roomId") as string,
          peerConnection.current
        );
        console.log("The sdp offer is", res);
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
    } else if (userRole == "calee") {
      const roomId = searchParams.get("roomId");
      console.log("the joining candidate has a roomId of ", roomId);
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
