"use client";
import { useRef, useEffect, useState } from "react";
import { createSdpOffer } from "@/utils/functions/sdpOffer";
import { iceCandidate } from "@/utils/functions/iceCandidate";
import Controls from "@/components/ui/Controls";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import getUserDevices, {
  updateMediaStream,
} from "../../../utils/functions/getDevicesAndMedia";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { useParams } from "next/navigation";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";

export default function PodSpacePage() {
  const { isLoaded, user } = useUser();
  const params = useParams();
  const { ws, webWorkerRef } = useApplicationContext();
  // const peerConnection = useRef<RTCPeerConnection>(null);
  const deviceTypeToID = useRef<Map<string, string>>(new Map());
  const [srcAudioStream, setSrcAudioStream] = useState<MediaStream | undefined>(
    undefined
  );
  const [srcVideoStream, setSrcVideoStream] = useState<MediaStream | undefined>(
    undefined
  );
  const initialSrcAudioStream = useRef<MediaStream | undefined>(undefined);
  const initialSrcVideoStream = useRef<MediaStream | undefined>(undefined);

  const audioRecorder = useRef<MediaRecorder | null>(null);
  const videoRecorder = useRef<MediaRecorder | null>(null);
  const screenShareRecorderRef = useRef<MediaRecorder | null>(null);
  // const webWorkerRef = useRef<Worker | null>(null);

  const [audioInputOptions, setAudioInputOptions] =
    useState<MediaDeviceInfo[]>();

  const [videoOptions, setVideoOptions] = useState<MediaDeviceInfo[]>();
  const existingUserIds = useRef<string[]>([]);
  const peerConnectionInfo = useRef<peerConnectionInfo[]>([]);
  //A record from peerId to peerStreamInfo
  const [peerStreamInfo, setPeerStreamInfo] = useState<
    Record<string, peerStreamInfo>
  >({});

  const updatePeerStream = (
    peerId: string,
    mediaType: string,
    mediaStream: MediaStream
  ) => {
    setPeerStreamInfo((prev) => ({
      ...prev,
      [peerId]: {
        ...prev[peerId],
        [mediaType]: mediaStream,
      },
    }));
  };

  const initializePeerStream = (peerId: string) => {
    //set the state of the record to be empty for all the fields.

    setPeerStreamInfo((prev) => ({
      ...prev,
      [peerId]: {
        peerAudioStream: null,
        peerVideoStream: null,
        peerScreenShareAudioStream: null,
        peerScreenShareVideoStream: null,
      },
    }));
  };

  interface peerStreamInfo {
    peerAudioStream: MediaStream | null;
    peerVideoStream: MediaStream | null;
    peerScreenShareAudioStream: MediaStream | null;
    peerScreenShareVideoStream: MediaStream | null;
  }

  interface peerConnectionInfo {
    to: string;
    peerConnection: RTCPeerConnection;
    remoteDeviceTypeToId: Map<string, string>;
    pendingIceCandidates: RTCIceCandidate[];
  }

  useEffect(() => {
    //If the user is logged in only then continue, else send them to the dashboard page
    if (isLoaded && user) {
      const getUserDevicesandSetupHandler = async () => {
        //initialze a new worker
        const workerScript = new Worker(
          new URL("../../../../public/chunkStore.ts", import.meta.url)
        );
        webWorkerRef.current = workerScript;

        const mediaStreams = await getUserDevices(
          audioRecorder,
          videoRecorder,
          webWorkerRef,
          user.id
        );

        if (mediaStreams) {
          const [audioStream, videoStream] = mediaStreams;
          initialSrcAudioStream.current = audioStream;
          initialSrcVideoStream.current = videoStream;
          console.log("initial audio", audioStream);
          console.log("initialvideo", videoStream);
          setSrcAudioStream(audioStream);
          setSrcVideoStream(videoStream);
          //Add the device id along with kind in the MAP.
          deviceTypeToID.current.clear();
          deviceTypeToID.current.set(audioStream.id, "peerAudio");
          deviceTypeToID.current.set(videoStream.id, "peerVideo");
        }
        if (!ws.current) {
          console.log("JOINED FROM LINK");
          // user is logged in, but does not have a ws connection, meaning they joined from the link.
          // Create a new ws connection, and send the join event.
          const roomId = params.roomId;

          ws.current = new WebSocket("wss://www.qwalpod.live/api/ws");
          //send the join room.
          const wsHandler = new WebSocketConnHandle(ws.current, 500);
          wsHandler.waitForConnection(() => {
            ws.current?.send(
              JSON.stringify({
                event: "joinRoom",
                data: {
                  roomId: roomId,
                  userId: user.id,
                },
              })
            );
          });
        } else {
          ws.current?.send(
            JSON.stringify({
              event: "joinRoom",
              data: {
                roomId: localStorage.getItem("roomId"),
                userId: user.id,
              },
            })
          );
        }
        //add the details of the user to the users table.
        try {
          const res = await axios.post(
            "https://www.qwalpod.live/api/dbRecord/addUserToRoom",
            {
              meetingId: localStorage.getItem("roomId") as string,
              userId: user.id,
            }
          );
          console.log(
            "Successfully added the user to the meeting record",
            res.data
          );
        } catch (e) {
          console.log("Error occured while storing to db", e);
        }

        //function to process the pending ice Candidates
        const processPendingIceCandidates = async (
          targetPeer: peerConnectionInfo
        ) => {
          if (targetPeer.pendingIceCandidates.length > 0) {
            for (const candidate of targetPeer.pendingIceCandidates) {
              try {
                await targetPeer.peerConnection.addIceCandidate(candidate);
              } catch (e) {
                console.error("Error adding buffered ICE candidate:", e);
              }
            }

            // Clear the buffer
            targetPeer.pendingIceCandidates = [];
          }
        };

        //Get all the existing users in room.

        ws.current.onmessage = async (event) => {
          const res = JSON.parse(event.data.toString());
          if (res.type === "error") {
            // console.log(res.data);
          } else if (res.type === "success") {
            console.log(res.data);
          } else if (res.type === "participantJoined") {
            //the newly joined participant should first get the list of all the
            //users in the room.
            console.log("participant joined triggered ");
            //Do not send a connection req to everyone in the array, rather.
            //The new person that joined, should only initialte the calls.
            const existingUsers = res.existingUsers;
            const currentUserId = user.id;
            //Check if for the new existing users array, the diff between the existing users,
            //and the `peerConnectionInfo` array is 1. If it is so, then you are already in the room,
            //Do nothing. Else, you are the new peer, estabilish the connection.
            //If there is only 1 total existing user in the room, then you are the first one. return.
            if (existingUsers.length === 1) {
              console.log("You are the first one here chillax. ");
              return;
            }

            //Peer connection Info stores information about the connections with peers, If it is empty, you are the new user.
            const shouldInitiateConnections =
              peerConnectionInfo.current.length === 0;
            //Then for each userId, it should estabilish a new RTCPeerConnection.
            if (!shouldInitiateConnections) {
              console.log(
                "Already have connections - existing user, don't initiate"
              );
              return;
            }

            const usersToConnectTo = existingUsers.filter(
              (userId: string, index: number) =>
                userId !== currentUserId &&
                existingUsers.indexOf(userId) === index
            );
            existingUserIds.current = usersToConnectTo;

            if (Array.isArray(existingUserIds.current)) {
              //Do get user mEdia here.
              usersToConnectTo.forEach(async (usr: string) => {
                //send the sdp offer, receive and ans set the local and remote description.
                const config = {
                  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
                };

                const newPeerConnection = new RTCPeerConnection(config);
                initializePeerStream(usr);
                //wait for the initalSrc audio and the video stream to load.
                if (
                  !initialSrcAudioStream.current ||
                  !initialSrcVideoStream.current
                ) {
                  console.log(
                    "FAILURE IN ADDING THE SRC AUDIO AND VIDEO STREAMS NO STREAMS FOUND"
                  );
                  return;
                }
                initialSrcAudioStream.current.getTracks().forEach((track) => {
                  if (
                    !initialSrcAudioStream.current ||
                    !initialSrcVideoStream.current
                  ) {
                    console.log(
                      "FAILURE IN ADDING THE SRC AUDIO AND VIDEO STREAMS NO STREAMS FOUND. INSIDE THE TRACK"
                    );
                    return;
                  }
                  newPeerConnection.addTrack(
                    track,
                    initialSrcAudioStream.current
                  );
                });
                initialSrcVideoStream.current.getTracks().forEach((track) => {
                  if (
                    !initialSrcAudioStream.current ||
                    !initialSrcVideoStream.current
                  ) {
                    console.log(
                      "FAILURE IN ADDING THE SRC AUDIO AND VIDEO STREAMS NO STREAMS FOUND. INSIDE THE TRACK"
                    );
                    return;
                  }
                  newPeerConnection.addTrack(
                    track,
                    initialSrcVideoStream.current
                  );
                });
                // }

                //Create a new object containing the userId(to), peerConnection, remoteStream(audio, video & screenshare)
                const newUser: peerConnectionInfo = {
                  to: usr,
                  peerConnection: newPeerConnection,
                  remoteDeviceTypeToId: new Map(),
                  pendingIceCandidates: [],
                };
                //Add the new object to an array keeping track of all the peerConnections.
                peerConnectionInfo.current.push(newUser);
                console.log("NEW USER PUSHED", newUser);

                //Send the new SDP offer and the IceCandidates from: the userID, to: The id to which the offer should be sent to
                if (!ws.current) {
                  return;
                }
                await createSdpOffer({
                  sender: ws.current,
                  roomId: localStorage.getItem("roomId") as string,
                  peerConnection: newPeerConnection,
                  streamMetadata: deviceTypeToID.current,
                  fromId: user.id as string,
                  toId: usr,
                });

                //send the Ice Candidates as well.
                iceCandidate({
                  sender: ws.current,
                  roomId: localStorage.getItem("roomId") as string,
                  peerConnection: newPeerConnection,
                  fromId: user.id as string,
                  toId: usr,
                });

                //Add all the listeners.
                newPeerConnection.onconnectionstatechange = () => {
                  console.log(newPeerConnection.signalingState);
                };
                //@note - THIS SHOULD BE HITTING BUT IS NOT HITTING.
                newPeerConnection.onnegotiationneeded = async () => {
                  console.log(
                    "Negotiation is required. sending again the sdp offers."
                  );
                  //@note- This can cause errors

                  if (!ws.current) {
                    console.log("No websocket found");
                    return;
                  }
                  await createSdpOffer({
                    sender: ws.current,
                    roomId: localStorage.getItem("roomId") as string,
                    peerConnection: newPeerConnection,
                    streamMetadata: deviceTypeToID.current,
                    fromId: user.id as string,
                    toId: usr,
                  });
                };

                navigator.mediaDevices.ondevicechange = async () => {
                  console.log("DEVICE CHANGED");
                  await updateMediaStream({
                    setVideoOptions,
                    setAudioInputOptions,
                  });

                  const mediaStreams = await getUserDevices(
                    audioRecorder,
                    videoRecorder,
                    webWorkerRef,
                    user.id
                  );
                  if (!mediaStreams) return;
                  const [newAudioStream, newVideoStream] = mediaStreams;

                  // Replace audio track
                  if (srcAudioStream && newAudioStream) {
                    const oldAudioTrack = srcAudioStream.getAudioTracks()[0];
                    const newAudioTrack = newAudioStream.getAudioTracks()[0];
                    if (oldAudioTrack)
                      srcAudioStream.removeTrack(oldAudioTrack);
                    if (newAudioTrack) srcAudioStream.addTrack(newAudioTrack);
                  }

                  // Replace video track
                  if (srcVideoStream && newVideoStream) {
                    const oldVideoTrack = srcVideoStream.getVideoTracks()[0];
                    const newVideoTrack = newVideoStream.getVideoTracks()[0];
                    if (oldVideoTrack)
                      srcVideoStream.removeTrack(oldVideoTrack);
                    if (newVideoTrack) srcVideoStream.addTrack(newVideoTrack);
                  }

                  // Update peer connection tracks seamlessly
                  if (newPeerConnection) {
                    const audioSender = newPeerConnection
                      .getSenders()
                      .find((s) => s.track && s.track.kind === "audio");
                    if (audioSender && newAudioStream.getAudioTracks()[0]) {
                      audioSender.replaceTrack(
                        newAudioStream.getAudioTracks()[0]
                      );
                    }

                    const videoSender = newPeerConnection
                      .getSenders()
                      .find((s) => s.track && s.track.kind === "video");
                    if (videoSender && newVideoStream.getVideoTracks()[0]) {
                      videoSender.replaceTrack(
                        newVideoStream.getVideoTracks()[0]
                      );
                    }
                  }
                };
              });
              //send the ice candidates.
              //add event listeners to each peerConnection.
            }
          } else if (res.type === "offer") {
            const remoteSdpOffer = res.data.offer;

            if (!ws.current) {
              console.log("NO WEBSOCKET FOUND RETURNING");
              return;
            }

            // Check if this is a renegotiation (existing connection) or new connection
            const existingPeer = peerConnectionInfo.current.find((peer) => {
              return peer.to === res.data.fromId;
            });

            if (existingPeer) {
              // This is a renegotiation (e.g., screen share)
              console.log("HANDLING RENEGOTIATION OFFER!!!!!!");
              //set the peers streammeta data!!!!!.
              existingPeer.remoteDeviceTypeToId = new Map(
                Object.entries(res.data.streamMetaData as [string, string])
              );

              try {
                // Set the remote description on the existing connection
                await existingPeer.peerConnection.setRemoteDescription(
                  new RTCSessionDescription(remoteSdpOffer)
                );
                await processPendingIceCandidates(existingPeer);

                // Create and send answer
                const answer = await existingPeer.peerConnection.createAnswer();
                await existingPeer.peerConnection.setLocalDescription(answer);

                ws.current.send(
                  JSON.stringify({
                    event: "sendAnswer",
                    data: {
                      roomId: localStorage.getItem("roomId"),
                      answer: answer,
                      streamMetaData: Object.fromEntries(
                        deviceTypeToID.current
                      ),
                      fromId: user.id,
                      toId: res.data.fromId,
                    },
                  })
                );
                console.log("Renegotiation answer sent successfully");
              } catch (error) {
                console.error("Error handling renegotiation:", error);
              }
            } else {
              // This is the initial connection setup
              console.log("HANDLING INITIAL OFFER");
              const fromId = res.data.fromId;
              const toId = res.data.toId;

              if (toId != user.id) {
                console.log("Incorrect receiver - offer not for this user");
                return;
              }

              const remoteOffer = res.data.offer;
              console.log("The remote offer is", remoteOffer);

              const config = {
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
              };

              // Set up a new peerConnection
              const newPeerConnection = new RTCPeerConnection(config);

              // Create the peer info object
              const newJoinee: peerConnectionInfo = {
                to: fromId,
                peerConnection: newPeerConnection,
                remoteDeviceTypeToId: new Map(
                  Object.entries(res.data.streamMetaData as [string, string])
                ),
                pendingIceCandidates: [],
              };

              // Add to the array
              peerConnectionInfo.current.push(newJoinee);

              // Initialize the peer remote stream
              initializePeerStream(fromId);

              // Set up ontrack event handler BEFORE adding tracks
              newPeerConnection.ontrack = (event) => {
                console.log("Received remote track from", fromId);
                const remoteStream = event.streams[0];
                const remoteStreamId = remoteStream.id;
                const remoteDeviceType =
                  newJoinee.remoteDeviceTypeToId.get(remoteStreamId);

                console.log(
                  "Remote device type:",
                  remoteDeviceType,
                  "for stream:",
                  remoteStreamId
                );

                if (remoteDeviceType === "peerAudio") {
                  updatePeerStream(fromId, "peerAudioStream", remoteStream);
                } else if (remoteDeviceType === "peerVideo") {
                  updatePeerStream(fromId, "peerVideoStream", remoteStream);
                } else if (remoteDeviceType === "peerScreenShare") {
                  updatePeerStream(
                    fromId,
                    "peerScreenShareAudioStream",
                    remoteStream
                  );
                  updatePeerStream(
                    fromId,
                    "peerScreenShareVideoStream",
                    remoteStream
                  );
                }
              };

              try {
                // Get user media and add tracks
                if (
                  !initialSrcAudioStream.current ||
                  !initialSrcVideoStream.current
                ) {
                  console.log(
                    "FAILURE IN ADDING THE SRC AUDIO AND VIDEO STREAMS NO STREAMS FOUND"
                  );
                  return;
                }
                initialSrcAudioStream.current.getTracks().forEach((track) => {
                  if (
                    !initialSrcAudioStream.current ||
                    !initialSrcVideoStream.current
                  ) {
                    console.log(
                      "FAILURE IN ADDING THE SRC AUDIO AND VIDEO STREAMS NO STREAMS FOUND. INSIDE THE TRACK"
                    );
                    return;
                  }
                  newPeerConnection.addTrack(
                    track,
                    initialSrcAudioStream.current
                  );
                });
                initialSrcVideoStream.current.getTracks().forEach((track) => {
                  if (
                    !initialSrcAudioStream.current ||
                    !initialSrcVideoStream.current
                  ) {
                    console.log(
                      "FAILURE IN ADDING THE SRC AUDIO AND VIDEO STREAMS NO STREAMS FOUND. INSIDE THE TRACK"
                    );
                    return;
                  }
                  newPeerConnection.addTrack(
                    track,
                    initialSrcVideoStream.current
                  );
                });

                // if (srcAudioStream && srcVideoStream) {
                //   // Add tracks to peer connection
                //   srcAudioStream.getTracks().forEach((track) => {
                //     newPeerConnection.addTrack(track, srcAudioStream);
                //   });
                //   srcVideoStream.getTracks().forEach((track) => {
                //     newPeerConnection.addTrack(track, srcVideoStream);
                //   });
                // } else {
                //   console.log("No streams found returning");
                //   return;
                // }
              } catch (error) {
                console.error("Error in initial offer handling:", error);
              }

              // Set remote description
              console.log("setting remore description");
              await newPeerConnection.setRemoteDescription(
                new RTCSessionDescription(remoteOffer)
              );

              // Process any buffered ICE candidates
              await processPendingIceCandidates(newJoinee);

              // Create and set local description (answer)

              const answer = await newPeerConnection.createAnswer();
              await newPeerConnection.setLocalDescription(answer);
              console.log("SEding the answer");

              // Send the answer
              ws.current.send(
                JSON.stringify({
                  event: "sendAnswer",
                  data: {
                    roomId: localStorage.getItem("roomId"),
                    answer: answer,
                    streamMetaData: Object.fromEntries(deviceTypeToID.current),
                    fromId: user.id,
                    toId: fromId,
                  },
                })
              );
              // Set up ICE candidate handling for this peer connection
              iceCandidate({
                sender: ws.current,
                roomId: localStorage.getItem("roomId") as string,
                peerConnection: newPeerConnection,
                fromId: user.id as string,
                toId: fromId,
              });
              // Add event listeners
              newPeerConnection.onconnectionstatechange = () => {
                console.log(
                  "Connection state for",
                  fromId,
                  ":",
                  newPeerConnection.connectionState
                );
              };

              newPeerConnection.onnegotiationneeded = async () => {
                console.log("Negotiation needed for peer", fromId);
                if (!ws.current) {
                  console.log("No websocket found");
                  return;
                }
                await createSdpOffer({
                  sender: ws.current,
                  roomId: localStorage.getItem("roomId") as string,
                  peerConnection: newPeerConnection,
                  streamMetadata: deviceTypeToID.current,
                  fromId: user.id as string,
                  toId: fromId,
                });
              };

              // Device change handler
              navigator.mediaDevices.ondevicechange = async () => {
                console.log("DEVICE CHANGED");
                await updateMediaStream({
                  setVideoOptions,
                  setAudioInputOptions,
                });

                const mediaStreams = await getUserDevices(
                  audioRecorder,
                  videoRecorder,
                  webWorkerRef,
                  user.id
                );
                if (!mediaStreams) return;
                const [newAudioStream, newVideoStream] = mediaStreams;

                // Replace audio track
                if (srcAudioStream && newAudioStream) {
                  const oldAudioTrack = srcAudioStream.getAudioTracks()[0];
                  const newAudioTrack = newAudioStream.getAudioTracks()[0];
                  if (oldAudioTrack) srcAudioStream.removeTrack(oldAudioTrack);
                  if (newAudioTrack) srcAudioStream.addTrack(newAudioTrack);
                }

                // Replace video track
                if (srcVideoStream && newVideoStream) {
                  const oldVideoTrack = srcVideoStream.getVideoTracks()[0];
                  const newVideoTrack = newVideoStream.getVideoTracks()[0];
                  if (oldVideoTrack) srcVideoStream.removeTrack(oldVideoTrack);
                  if (newVideoTrack) srcVideoStream.addTrack(newVideoTrack);
                }

                // Update peer connection tracks seamlessly
                if (newPeerConnection) {
                  const audioSender = newPeerConnection
                    .getSenders()
                    .find((s) => s.track && s.track.kind === "audio");
                  if (audioSender && newAudioStream.getAudioTracks()[0]) {
                    audioSender.replaceTrack(
                      newAudioStream.getAudioTracks()[0]
                    );
                  }

                  const videoSender = newPeerConnection
                    .getSenders()
                    .find((s) => s.track && s.track.kind === "video");
                  if (videoSender && newVideoStream.getVideoTracks()[0]) {
                    videoSender.replaceTrack(
                      newVideoStream.getVideoTracks()[0]
                    );
                  }
                }
              };
            }
          } else if (res.type == "answer") {
            //Find the peer that you have received answer of.
            const targetPeer = peerConnectionInfo.current.find((peer) => {
              return peer.to === res.data.fromId;
            });

            if (!targetPeer) {
              console.log("no peer connection found");
              return;
            }
            targetPeer.remoteDeviceTypeToId = new Map(
              Object.entries(res.data.streamMetaData as [string, string])
            );
            console.log(
              "The remote deviceTypToId after receiving the answer is ",
              targetPeer.remoteDeviceTypeToId
            );
            // Remove existing ontrack listener to avoid duplicates
            targetPeer.peerConnection.ontrack = null;
            targetPeer.peerConnection.ontrack = (event) => {
              console.log("On track triggered");
              const remoteStream = event.streams[0];
              const remoteStreamId = remoteStream.id;
              const remoteDeviceType =
                targetPeer.remoteDeviceTypeToId.get(remoteStreamId);

              if (remoteDeviceType === "peerAudio") {
                console.log("updating peer audio");
                updatePeerStream(
                  res.data.fromId,
                  "peerAudioStream",
                  remoteStream
                );
                // setPeerAudioStream(remoteStream);
              } else if (remoteDeviceType === "peerVideo") {
                console.log("updating peer video component using hmr");
                updatePeerStream(
                  res.data.fromId,
                  "peerVideoStream",
                  remoteStream
                );
              } else if (remoteDeviceType === "peerScreenShare") {
                console.log("Updating the peers screen share");
                updatePeerStream(
                  res.data.fromId,
                  "peerScreenShareAudioStream",
                  remoteStream
                );
                updatePeerStream(
                  res.data.fromId,
                  "peerScreenShareVideoStream",
                  remoteStream
                );
              }
            };
            const remoteDesc = new RTCSessionDescription(res.data.answer);

            if (!targetPeer.peerConnection) {
              return;
            }
            await targetPeer.peerConnection.setRemoteDescription(remoteDesc);
            await processPendingIceCandidates(targetPeer);
          } else if (res.type == "iceCandidate") {
            //Find the peer that you have received answer of.
            const targetPeer = peerConnectionInfo.current.find((peer) => {
              return peer.to === res.data.fromId;
            });
            if (!targetPeer) {
              console.log("no peer connection found");
              return;
            }

            const remoteIceCandidate = res.data.iceCandidate;
            if (!targetPeer.peerConnection) {
              return;
            }
            if (targetPeer.peerConnection.remoteDescription) {
              try {
                await targetPeer.peerConnection.addIceCandidate(
                  remoteIceCandidate
                );
              } catch (e) {
                console.log(e);
              }
            } else {
              targetPeer.pendingIceCandidates.push(
                new RTCIceCandidate(remoteIceCandidate)
              );
            }
          }
        };
      };
      getUserDevicesandSetupHandler();
    }
  }, [isLoaded, user]);

  // Total participants = you + peers
  const totalParticipants = peerConnectionInfo.current.length + 1;

  // Dynamically calculate columns
  // We'll aim for a square-like layout (sqrt-based) for balance
  const columns = Math.ceil(Math.sqrt(totalParticipants));
  const rows = Math.ceil(totalParticipants / columns);
  return (
    <div className="w-screen h-screen grid grid-rows-[85%_15%] bg-black">
      {/* Video Section */}
      <div
        className="w-full h-full grid gap-4 overflow-x-hidden"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {/* Your video */}
        <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black flex items-center justify-center">
          <video
            className="w-full h-full object-cover"
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

        {/* Peers' videos */}
        {peerStreamInfo &&
          peerConnectionInfo.current.map((peerInfo) => {
            const streams = peerStreamInfo[peerInfo.to] || {};
            return (
              <div
                key={peerInfo.to}
                className="relative rounded-2xl overflow-hidden shadow-lg bg-black flex items-center justify-center"
              >
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                  ref={(video) => {
                    if (video && streams.peerVideoStream) {
                      video.srcObject = streams.peerVideoStream;
                    }
                  }}
                ></video>
                <audio
                  autoPlay
                  ref={(audio) => {
                    if (audio && streams.peerAudioStream) {
                      audio.srcObject = streams.peerAudioStream;
                    }
                  }}
                ></audio>
                {streams.peerScreenShareVideoStream && (
                  <video
                    className="absolute top-2 right-2 w-40 h-24 border-2 border-white rounded-lg shadow-lg"
                    autoPlay
                    playsInline
                    muted
                    ref={(video) => {
                      if (video && streams.peerScreenShareVideoStream) {
                        video.srcObject = streams.peerScreenShareVideoStream;
                      }
                    }}
                  ></video>
                )}
              </div>
            );
          })}
      </div>

      {/* Controls Section */}
      <div className="w-full h-full flex items-center justify-center bg-gray-900 shadow-inner">
        <Controls
          audioInputOptions={audioInputOptions}
          setAudioInputOptions={setAudioInputOptions}
          setVideoOptions={setVideoOptions}
          videoOptions={videoOptions}
          peerConnectionInfo={peerConnectionInfo}
          srcVideoStream={srcVideoStream}
          setSrcVideoStream={setSrcVideoStream}
          srcAudioStream={srcAudioStream}
          setSrcAudioStream={setSrcAudioStream}
          deviceTypeToID={deviceTypeToID}
          // webWorkerRef={webWorkerRef}
          audioRecorderRef={audioRecorder}
          videoRecorderRef={videoRecorder}
          userId={user?.id}
          screenShareRecorderRef={screenShareRecorderRef}
        />
      </div>
    </div>
  );
}
