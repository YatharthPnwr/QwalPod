"use client";
import { useRef, useEffect, useState } from "react";
import { createSdpOffer } from "@/utils/functions/sdpOffer";
import { iceCandidate } from "@/utils/functions/iceCandidate";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import { useParams } from "next/navigation";
import Controls from "@/components/ui/Controls";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import getUserDevices, {
  updateMediaStream,
} from "../../../utils/functions/getDevicesAndMedia";

export default function PodSpacePage({ userRole }: { userRole: string }) {
  const { ws, setUserRole } = useApplicationContext();
  // const peerConnection = useRef<RTCPeerConnection>(null);
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
  const hasInitialNegotiationCompleted = useRef<boolean>(false);

  const [audioInputOptions, setAudioInputOptions] =
    useState<MediaDeviceInfo[]>();

  const [videoOptions, setVideoOptions] = useState<MediaDeviceInfo[]>();
  const existingUserIds = useRef<string[]>([]);
  const peerConnectionInfo = useRef<peerConnectionInfo[]>([]);
  //A recordd from peerId to peerStreamInfo
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
    //Dont use this method. ALways joinroom by entering the id. in the text box.

    // @note - This will be fixed when we have the id always.

    if (!ws.current) {
      //Someone joined from the link
      //This may be sending multiple websocket msgs to join room.
      //The userId will not be defined here if the user joins
      ws.current = new WebSocket("ws://localhost:3000/api/ws");
      console.log("There was no websocket found !");
      const wsConnMan = new WebSocketConnHandle(ws.current, 1800);
      wsConnMan.waitForConnection(() => {
        ws.current?.send(
          JSON.stringify({
            event: "joinRoom",
            data: {
              roomId: localStorage.getItem("roomId"),
              //This wont be defined here. So join by entering the roomId
              userId: localStorage.getItem("userId"),
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
            userId: localStorage.getItem("userId"),
          },
        })
      );
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

    // Get the user devices and media.
    (async () => {
      const mediaStreams = await getUserDevices();
      if (mediaStreams) {
        const [audioStream, videoStream] = mediaStreams;
        setSrcAudioStream(audioStream);
        setSrcVideoStream(videoStream);
        //Add the device id along with kind in the MAP.
        deviceTypeToID.current.clear();
        deviceTypeToID.current.set(audioStream.id, "peerAudio");
        deviceTypeToID.current.set(videoStream.id, "peerVideo");
      }
    })();

    ws.current.onmessage = async (event) => {
      const res = JSON.parse(event.data.toString());

      if (res.type === "error") {
        // console.log(res.data);
      } else if (res.type === "success") {
        console.log(res.data);
      } else if (res.type === "participantJoined") {
        //the newly joined participant should first get the list of all the
        //users in the room.

        //Implement the logic so that the people already in the room,
        //Do not send a connection req to everyone in the array, rather.
        //The new person that joined, should only initialte the calls.
        const existingUsers = res.existingUsers;
        const currentUserId = localStorage.getItem("userId");
        //Check if for the new existing users array, the diff between the existing users,
        //and the `peerConnectionInfo` array is 1. If it is so, then you are already in the room,
        //Do nothing. Else, you are the new peer, estabilish the connection.
        //If there is only 1 total existing user in the room, then you are the first one. return.
        if (existingUsers.length === 1) {
          console.log("You are the first one here chillax. ");
          return;
        }
        const usersToConnectTo = existingUsers.filter(
          (userId, index) =>
            userId !== currentUserId && existingUsers.indexOf(userId) === index
        );
        const shouldInitiateConnections =
          peerConnectionInfo.current.length === 0;
        //Then for each userId, it should estabilish a new RTCPeerConnection.
        if (!shouldInitiateConnections) {
          console.log(
            "Already have connections - existing user, don't initiate"
          );
          return;
        }
        existingUserIds.current = usersToConnectTo;

        if (Array.isArray(existingUserIds.current)) {
          //Do get user mEdia here.
          usersToConnectTo.forEach(async (usr) => {
            //send the sdp offer, receive and ans set the local and remote description.
            const config = {
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            };

            const newPeerConnection = new RTCPeerConnection(config);
            initializePeerStream(usr);
            const mediaStreams = await getUserDevices();
            if (mediaStreams) {
              const [audioStream, videoStream] = mediaStreams;
              setSrcAudioStream(audioStream);
              setSrcVideoStream(videoStream);
              //Add the device id along with kind in the MAP.
              deviceTypeToID.current.clear();
              deviceTypeToID.current.set(audioStream.id, "peerAudio");
              deviceTypeToID.current.set(videoStream.id, "peerVideo");

              audioStream.getTracks().forEach((track) => {
                newPeerConnection.addTrack(track, audioStream);
              });
              setSrcAudioStream(audioStream);
              videoStream.getTracks().forEach((track) => {
                newPeerConnection.addTrack(track, videoStream);
              });
            }

            //Create a new object containing the userId(to), peerConnection, remoteStream(audio, video & screenshare)
            const newUser: peerConnectionInfo = {
              to: usr,
              peerConnection: newPeerConnection,
              remoteDeviceTypeToId: new Map(),
              pendingIceCandidates: [],
            };
            //Add the new object to an array keeping track of all the peerConnections.
            peerConnectionInfo.current.push(newUser);

            //Send the new SDP offer and the IceCandidates from: the userID, to: The id to which the offer should be sent to
            if (!ws.current) {
              return;
            }
            await createSdpOffer({
              sender: ws.current,
              roomId: localStorage.getItem("roomId") as string,
              peerConnection: newPeerConnection,
              streamMetadata: deviceTypeToID.current,
              fromId: localStorage.getItem("userId") as string,
              toId: usr,
            });

            //send the Ice Candidates as well.
            iceCandidate({
              sender: ws.current,
              roomId: localStorage.getItem("roomId") as string,
              peerConnection: newPeerConnection,
              fromId: localStorage.getItem("userId") as string,
              toId: usr,
            });

            //Add all the listeners.
            newPeerConnection.onconnectionstatechange = (event) => {
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
                fromId: localStorage.getItem("userId") as string,
                toId: usr,
              });
            };

            navigator.mediaDevices.ondevicechange = async () => {
              console.log("DEVICE CHANGED");
              await updateMediaStream({
                setVideoOptions,
                setAudioInputOptions,
              });

              if (srcAudioStream && newPeerConnection) {
                srcAudioStream.getTracks().forEach((track) => {
                  const sender = newPeerConnection
                    .getSenders()
                    .find((s) => s.track === track);
                  if (sender) {
                    newPeerConnection.removeTrack(sender);
                  }
                });
              }

              if (srcVideoStream && newPeerConnection) {
                srcVideoStream.getTracks().forEach((track) => {
                  const sender = newPeerConnection
                    .getSenders()
                    .find((s) => s.track === track);
                  if (sender) {
                    newPeerConnection.removeTrack(sender);
                  }
                });
              }
              //get the new user media and set it.
              const mediaStreams = await getUserDevices();
              if (mediaStreams) {
                const [audioStream, videoStream] = mediaStreams;
                setSrcAudioStream(audioStream);
                setSrcVideoStream(videoStream);
                //Add the device id along with kind in the MAP.
                deviceTypeToID.current.clear();
                deviceTypeToID.current.set(audioStream.id, "peerAudio");
                deviceTypeToID.current.set(videoStream.id, "peerVideo");
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
                  streamMetaData: Object.fromEntries(deviceTypeToID.current),
                  fromId: localStorage.getItem("userId"),
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

          if (toId != localStorage.getItem("userId")) {
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
            const mediaStreams = await getUserDevices();
            if (mediaStreams) {
              const [audioStream, videoStream] = mediaStreams;
              setSrcAudioStream(audioStream);
              setSrcVideoStream(videoStream);

              // Update device mapping
              deviceTypeToID.current.clear();
              deviceTypeToID.current.set(audioStream.id, "peerAudio");
              deviceTypeToID.current.set(videoStream.id, "peerVideo");

              // Add tracks to peer connection
              audioStream.getTracks().forEach((track) => {
                newPeerConnection.addTrack(track, audioStream);
              });
              videoStream.getTracks().forEach((track) => {
                newPeerConnection.addTrack(track, videoStream);
              });
            } else {
              console.log("No streams found returning");
              return;
            }
          } catch (error) {
            console.error("Error in initial offer handling:", error);
          }

          // Set remote description
          await newPeerConnection.setRemoteDescription(
            new RTCSessionDescription(remoteOffer)
          );

          // Process any buffered ICE candidates
          await processPendingIceCandidates(newJoinee);

          // Create and set local description (answer)

          const answer = await newPeerConnection.createAnswer();
          await newPeerConnection.setLocalDescription(answer);

          // Send the answer
          ws.current.send(
            JSON.stringify({
              event: "sendAnswer",
              data: {
                roomId: localStorage.getItem("roomId"),
                answer: answer,
                streamMetaData: Object.fromEntries(deviceTypeToID.current),
                fromId: localStorage.getItem("userId"),
                toId: fromId,
              },
            })
          );
          // Set up ICE candidate handling for this peer connection
          iceCandidate({
            sender: ws.current,
            roomId: localStorage.getItem("roomId") as string,
            peerConnection: newPeerConnection,
            fromId: localStorage.getItem("userId") as string,
            toId: fromId,
          });

          // Add event listeners
          newPeerConnection.onconnectionstatechange = (event) => {
            console.log(
              "Connection state for",
              fromId,
              ":",
              newPeerConnection.connectionState
            );
          };

          newPeerConnection.onnegotiationneeded = async () => {
            console.log("Negotiation needed for peer", fromId);
            // if (!hasInitialNegotiationCompleted.current) {
            //   console.log(
            //     "FAILED TO SEND, INITIAL NEGOTIATION NOT YET COMPLETED"
            //   );
            //   return;
            // }
            if (!ws.current) {
              console.log("No websocket found");
              return;
            }
            await createSdpOffer({
              sender: ws.current,
              roomId: localStorage.getItem("roomId") as string,
              peerConnection: newPeerConnection,
              streamMetadata: deviceTypeToID.current,
              fromId: localStorage.getItem("userId") as string,
              toId: fromId,
            });
          };

          // Device change handler
          navigator.mediaDevices.ondevicechange = async () => {
            console.log("DEVICE CHANGED for peer", fromId);
            await updateMediaStream({
              setVideoOptions,
              setAudioInputOptions,
            });

            // Remove old tracks and add new ones
            if (srcAudioStream && newPeerConnection) {
              srcAudioStream.getTracks().forEach((track) => {
                const sender = newPeerConnection
                  .getSenders()
                  .find((s) => s.track === track);
                if (sender) {
                  newPeerConnection.removeTrack(sender);
                }
              });
            }

            if (srcVideoStream && newPeerConnection) {
              srcVideoStream.getTracks().forEach((track) => {
                const sender = newPeerConnection
                  .getSenders()
                  .find((s) => s.track === track);
                if (sender) {
                  newPeerConnection.removeTrack(sender);
                }
              });
            }

            // Get new media streams
            const newMediaStreams = await getUserDevices();
            if (newMediaStreams) {
              const [audioStream, videoStream] = newMediaStreams;
              setSrcAudioStream(audioStream);
              setSrcVideoStream(videoStream);

              deviceTypeToID.current.clear();
              deviceTypeToID.current.set(audioStream.id, "peerAudio");
              deviceTypeToID.current.set(videoStream.id, "peerVideo");
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
            updatePeerStream(res.data.fromId, "peerAudioStream", remoteStream);
            // setPeerAudioStream(remoteStream);
          } else if (remoteDeviceType === "peerVideo") {
            updatePeerStream(res.data.fromId, "peerVideoStream", remoteStream);
          } else if (remoteDeviceType === "peerScreenShare") {
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
            await targetPeer.peerConnection.addIceCandidate(remoteIceCandidate);
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
          {peerStreamInfo &&
            peerConnectionInfo.current.map((peerInfo) => {
              const streams = peerStreamInfo[peerInfo.to] || {};
              return (
                <div
                  key={peerInfo.to}
                  className="calee h-3/4 w-4/5 mx-auto my-auto rounded-2xl overflow-hidden"
                >
                  <video
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
                      autoPlay
                      playsInline
                      // set this untrue for unmuted
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
        <div className="w-screen">
          {
            <Controls
              audioInputOptions={audioInputOptions}
              setAudioInputOptions={setAudioInputOptions}
              setVideoOptions={setVideoOptions}
              videoOptions={videoOptions}
              // peerConnection={peerConnection.current}
              peerConnectionInfo={peerConnectionInfo}
              srcVideoStream={srcVideoStream}
              setSrcVideoStream={setSrcVideoStream}
              srcAudioStream={srcAudioStream}
              setSrcAudioStream={setSrcAudioStream}
              deviceTypeToID={deviceTypeToID}
            />
          }
        </div>
      </div>
    </>
  );
}
