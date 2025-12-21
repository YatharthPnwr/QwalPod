"use client";
import { useRef, useEffect, useState } from "react";
import { createSdpOffer } from "@/utils/functions/sdpOffer";
import { iceCandidate } from "@/utils/functions/iceCandidate";
import Controls from "@/components/Controls";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import axios from "axios";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import PeerVideo from "@/components/PeerVideo";
import { ScreenShareStatus } from "@/utils/exports";
import { useMediaPredicate } from "react-media-hook";
import { Rnd } from "react-rnd";
import { handleRecording } from "@/utils/functions/getDevicesAndMedia";

export default function PodSpacePage({
  srcAudioStream,
  srcVideoStream,
  deviceTypeToID,
}: {
  srcAudioStream: MediaStream;
  srcVideoStream: MediaStream;
  deviceTypeToID: React.RefObject<Map<string, string>>;
}) {
  const { isLoaded, user } = useUser();
  const isSm = useMediaPredicate("(min-width: 640px)"); // ≥640px
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId;
  const { ws, webWorkerRef } = useApplicationContext();

  // const deviceTypeToId = useRef<Map<string, string>>(new Map());
  // const [srcAudioStream, setSrcAudioStream] = useState<MediaStream | undefined>(
  //   undefined
  // );
  // const [srcVideoStream, setSrcVideoStream] = useState<MediaStream | undefined>(
  //   undefined
  // );
  const [srcScreenShareStream, setSrcScreenShareStream] = useState<
    MediaStream | undefined
  >();
  const latestSrcScreenShareStream = useRef<MediaStream | undefined>(undefined);
  const [screenShareStatus, setScreenShareStatus] = useState<ScreenShareStatus>(
    ScreenShareStatus.IDLE
  );
  // const latestSrcAudioStream = useRef<MediaStream | undefined>(undefined);
  // const latestSrcVideoStream = useRef<MediaStream | undefined>(undefined);

  const audioRecorder = useRef<MediaRecorder | null>(null);
  const videoRecorder = useRef<MediaRecorder | null>(null);
  const screenShareRecorderRef = useRef<MediaRecorder | null>(null);

  // const [audioInputOptions, setAudioInputOptions] =
  //   useState<MediaDeviceInfo[]>();

  // const [videoOptions, setVideoOptions] = useState<MediaDeviceInfo[]>();
  const existingUserIds = useRef<string[]>([]);
  const peerConnectionInfo = useRef<peerConnectionInfo[]>([]);
  //A record from peerId to peerStreamInfo
  const [peerStreamInfo, setPeerStreamInfo] = useState<
    Record<string, peerStreamInfo>
  >({});

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

  const updatePeerStream = (
    peerId: string,
    mediaType: string,
    mediaStream: MediaStream
  ) => {
    setPeerStreamInfo((prev) => {
      const newState = {
        ...prev,
        [peerId]: {
          ...prev[peerId],
          [mediaType]: mediaStream,
        },
      };

      console.log("The new state is", newState);

      return newState;
    });
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
    //If the user is logged in only then continue, else send them to the dashboard page to login
    if (isLoaded && !user) {
      router.push("/");
      return;
    }
    if (isLoaded && user) {
      console.log("The srcAudioSteam", srcAudioStream);
      console.log("The srcVideoSteam is", srcVideoStream);

      window.addEventListener("beforeunload", () => {
        console.log("Exiting", user?.id);
        ws.current?.send(
          JSON.stringify({
            event: "disconnecting",
            data: {
              roomId: roomId,
              userId: user.id,
            },
          })
        );
      });

      //Start recording the localStream
      handleRecording(
        audioRecorder,
        videoRecorder,
        srcAudioStream,
        srcVideoStream,
        roomId as string,
        webWorkerRef,
        user.id as string
      );

      const setupWsHandler = async () => {
        //initialze a new worker
        if (!ws.current) {
          console.log("JOINED FROM LINK");
          // user is logged in, but does not have a ws connection, meaning they joined from the link.
          ws.current = new WebSocket(
            `${process.env.NEXT_PUBLIC_WS_BACKEND_URL as string}/api/ws`
          );
          localStorage.setItem("roomId", roomId as string);
        }
        //setup handlers
        ws.current.onmessage = async (event) => {
          const res = JSON.parse(event.data.toString());
          if (res.type === "error") {
            console.log(res.data);
          } else if (res.type === "success") {
            console.log(res.data);
          } else if (res.type === "screenShareStarted") {
            const userId = res.data.userId;
            console.log(userId, "started a screen share");
            setScreenShareStatus(ScreenShareStatus.PEERSHARING);
            //disable the screen share option
          } else if (res.type === "screenShareEnded") {
            const userId = res.data;
            setScreenShareStatus(ScreenShareStatus.IDLE);
            setPeerStreamInfo((prev) => {
              const newState = { ...prev };
              const userStreams = newState[userId];
              console.log("The peer stream is", userStreams);
              userStreams.peerScreenShareVideoStream = null;
              userStreams.peerScreenShareAudioStream = null;
              return newState;
            });
            console.log(userId, "started a screen share");
          } else if (res.type === "disconnected") {
            const userId = res.data.userId;
            console.log("The user that left is", userId);
            peerConnectionInfo.current = peerConnectionInfo.current.filter(
              (usr) => usr.to !== userId
            );
            // Clean up the disconnected peer's streams
            setPeerStreamInfo((prevRecord) => {
              const new_state = { ...prevRecord };
              delete new_state[userId];
              return new_state;
            });
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
            console.log("The users to connect to are, ", usersToConnectTo);
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
                srcAudioStream.getTracks().forEach((track) => {
                  newPeerConnection.addTrack(track, srcAudioStream);
                });
                srcVideoStream.getTracks().forEach((track) => {
                  newPeerConnection.addTrack(track, srcVideoStream);
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
                  roomId: params.roomId as string,
                  peerConnection: newPeerConnection,
                  streamMetadata: deviceTypeToID.current,
                  fromId: user.id as string,
                  toId: usr,
                });

                //send the Ice Candidates as well.
                iceCandidate({
                  sender: ws.current,
                  roomId: params.roomId as string,
                  peerConnection: newPeerConnection,
                  fromId: user.id as string,
                  toId: usr,
                });

                //Add all the listeners.
                newPeerConnection.onconnectionstatechange = () => {
                  console.log(newPeerConnection.signalingState);
                };
                // newPeerConnection.oniceconnectionstatechange = function () {
                //   if (newPeerConnection.iceConnectionState == "disconnected") {
                //     console.log(
                //       "Disconnected, checking if the wifi of the user went off"
                //     );
                //     peerConnectionInfo.current =
                //       peerConnectionInfo.current.filter(
                //         (usr) => usr.to !== newUser.to
                //       );
                //     // Clean up the disconnected peer's streams
                //     setPeerStreamInfo((prevRecord) => {
                //       const new_state = { ...prevRecord };
                //       delete new_state[newUser.to];
                //       return new_state;
                //     });
                //   }
                // };
                newPeerConnection.onnegotiationneeded = async () => {
                  console.log(
                    "Negotiation is required. sending again the sdp offers."
                  );

                  if (!ws.current) {
                    console.log("No websocket found");
                    return;
                  }
                  await createSdpOffer({
                    sender: ws.current,
                    roomId: params.roomId as string,
                    peerConnection: newPeerConnection,
                    streamMetadata: deviceTypeToID.current,
                    fromId: user.id as string,
                    toId: usr,
                  });
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
              console.log(
                "Setting the existing remore device type to Id as",
                existingPeer.remoteDeviceTypeToId
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
                      roomId: params.roomId,
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
              // console.log("The remote offer is", remoteOffer);

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
                console.log(
                  "THe EXISTING USERS REMOVE DEVICE TYPE TO ID IS, ",
                  newJoinee.remoteDeviceTypeToId
                );
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
                srcAudioStream.getTracks().forEach((track) => {
                  newPeerConnection.addTrack(track, srcAudioStream);
                });

                //Add all the videostream tracks
                srcVideoStream.getTracks().forEach((track) => {
                  newPeerConnection.addTrack(track, srcVideoStream);
                });
                if (latestSrcScreenShareStream.current) {
                  latestSrcScreenShareStream.current
                    .getTracks()
                    .forEach((track) => {
                      if (latestSrcScreenShareStream.current) {
                        newPeerConnection.addTrack(
                          track,
                          latestSrcScreenShareStream.current
                        );
                      }
                    });
                } else {
                  console.log("NO SCREEN SHARE STREAM TO ADD IN THE OFFER");
                }
              } catch (error) {
                console.error("Error in initial offer handling:", error);
              }

              // Set remote description
              console.log("setting remote description");
              await newPeerConnection.setRemoteDescription(
                new RTCSessionDescription(remoteOffer)
              );

              // Process any buffered ICE candidates
              await processPendingIceCandidates(newJoinee);

              // Create and set local description (answer)

              const answer = await newPeerConnection.createAnswer();
              await newPeerConnection.setLocalDescription(answer);
              console.log("Sending the answer");

              // Send the answer
              ws.current.send(
                JSON.stringify({
                  event: "sendAnswer",
                  data: {
                    roomId: params.roomId,
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
                roomId: params.roomId as string,
                peerConnection: newPeerConnection,
                fromId: user.id as string,
                toId: fromId,
              });
              // Add event listeners
              newPeerConnection.onconnectionstatechange = () => {
                console.log(
                  "Connection state for",
                  toId,
                  ":",
                  newPeerConnection.connectionState
                );
              };
              newPeerConnection.oniceconnectionstatechange = function () {
                if (newPeerConnection.iceConnectionState == "disconnected") {
                  console.log(
                    "Disconnected, checking if the wifi of the user went off"
                  );
                  peerConnectionInfo.current =
                    peerConnectionInfo.current.filter(
                      (usr) => usr.to !== newJoinee.to
                    );
                  // Clean up the disconnected peer's streams
                  setPeerStreamInfo((prevRecord) => {
                    const new_state = { ...prevRecord };
                    delete new_state[newJoinee.to];
                    return new_state;
                  });
                }
              };

              newPeerConnection.onnegotiationneeded = async () => {
                console.log("Negotiation needed for peer", fromId);
                if (!ws.current) {
                  console.log("No websocket found");
                  return;
                }
                await createSdpOffer({
                  sender: ws.current,
                  roomId: params.roomId as string,
                  peerConnection: newPeerConnection,
                  streamMetadata: deviceTypeToID.current,
                  fromId: user.id as string,
                  toId: fromId,
                });
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
              console.log("The current peerStream is", peerStreamInfo);

              if (remoteDeviceType === "peerAudio") {
                console.log("updating peer audio");
                console.log("The current peerStream is", peerStreamInfo);
                updatePeerStream(
                  res.data.fromId,
                  "peerAudioStream",
                  remoteStream
                );
                // setPeerAudioStream(remoteStream);
              } else if (remoteDeviceType === "peerVideo") {
                console.log("updating peer video component using hmr");
                console.log("The current peerStream is", peerStreamInfo);
                updatePeerStream(
                  res.data.fromId,
                  "peerVideoStream",
                  remoteStream
                );
              } else if (remoteDeviceType === "peerScreenShare") {
                //Make it so that this peer cannot share its screen now. until the already exisitng peer stop.
                setScreenShareStatus(ScreenShareStatus.PEERSHARING);
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

        //add the details of the user to the users table.
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/dbRecord/addUserToRoom`,
            {
              meetingId: roomId as string,
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
      };
      setupWsHandler();
    }
  }, [isLoaded, user]);

  // Total participants = you + peers
  const totalParticipants = peerConnectionInfo.current.length + 1;

  // Dynamically calculate columns
  // We'll aim for a square-like layout (sqrt-based) for balance
  const columns = Math.ceil(Math.sqrt(totalParticipants));
  const rows = Math.ceil(totalParticipants / columns);
  return (
    <div className="w-screen h-screen grid grid-rows-[80%_20%] bg-black">
      {/* Video Section */}
      <div
        className="w-full h-full grid gap-4 overflow-x-hidden"
        style={
          isSm
            ? {
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              }
            : {
                gridTemplateColumns: `repeat(${rows}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${columns}, minmax(0, 1fr))`,
              }
        }
      >
        {/* Your video */}
        <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black flex items-center justify-center">
          <video
            className="w-full h-full"
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
        {/*Src screen share stream*/}
        {srcScreenShareStream && (
          <div className="fixed z-40 flex items-center justify-center pointer-events-none">
            <Rnd
              className="pointer-events-auto"
              default={{
                // Bring x and y to center first, then translate x and y such
                //that the Rnd component comes to the center of the screen
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
                ref={(video) => {
                  if (video && srcScreenShareStream) {
                    video.srcObject = srcScreenShareStream;
                  }
                }}
              ></video>
            </Rnd>
          </div>
        )}

        {/*Peer screen share stream*/}

        {/* Peers' videos */}

        {peerStreamInfo &&
          peerConnectionInfo.current.map((peerInfo) => {
            const streams = peerStreamInfo[peerInfo.to] || {};
            console.log("PEEER STREAM INFO IS", streams);
            return (
              <PeerVideo key={peerInfo.to} to={peerInfo.to} streams={streams} />
            );
          })}
      </div>

      {/* Controls Section */}
      {isLoaded && user && (
        <div className="z-50 p-5 w-full h-full flex items-center justify-center shadow-inner">
          <Controls
            peerConnectionInfo={peerConnectionInfo}
            deviceTypeToID={deviceTypeToID}
            srcVideoStream={srcVideoStream}
            srcAudioStream={srcAudioStream}
            screenShareStatus={screenShareStatus}
            setScreenShareStatus={setScreenShareStatus}
            userId={user.id}
            roomId={params.roomId as string}
            setSrcScreenShareStream={setSrcScreenShareStream}
            srcScreenShareStream={srcScreenShareStream}
            screenShareRecorderRef={screenShareRecorderRef}
            latestSrcScreenShareStream={latestSrcScreenShareStream}
            audioRecorderRef={audioRecorder}
            videoRecorderRef={videoRecorder}
          />
        </div>
      )}
    </div>
  );
}
//Start recording process
