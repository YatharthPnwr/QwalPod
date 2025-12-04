import axios from "axios";
const dbName = "qwalPod";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let dbInstance: IDBDatabase | null = null;
let ffmpeg: FFmpeg | null = null;
let ffmpegReady = false;

// Open DB as soon as the worker loads
const dbRequest = indexedDB.open(dbName, 1);

dbRequest.onupgradeneeded = (event) => {
  const db = (event.target as IDBOpenDBRequest).result;
  if (!db.objectStoreNames.contains("Recordings")) {
    db.createObjectStore("Recordings", { keyPath: "meetingId" });
  }
};

dbRequest.onsuccess = () => {
  dbInstance = dbRequest.result;
  console.log("[Worker] IndexedDB opened successfully ");
};

dbRequest.onerror = () => {
  console.error("[Worker] Failed to open IndexedDB :", dbRequest.error);
};

function getUploadFileTypes(meetingId: string) {
  if (!dbInstance) {
    console.error("DB not ready yet! ");
    return;
  }
  //Get the type of files visible
  const tx1 = dbInstance.transaction("Recordings", "readwrite");
  const store1 = tx1.objectStore("Recordings");
  console.log("The meetingId is", meetingId);
  const getReq = store1.get(meetingId);
  getReq.onsuccess = (msg) => {
    const audioChunks: Blob[] = getReq.result.audioChunks;
    const videoChunks: Blob[] = getReq.result.videoChunks;
    const screenChunks: Blob[] = getReq.result.screenChunks;
    const uploadFileTypes = [];
    if (audioChunks.length > 0) {
      uploadFileTypes.push("audio");
    }
    if (videoChunks.length > 0) {
      uploadFileTypes.push("video");
    }
    if (screenChunks.length > 0) {
      uploadFileTypes.push("screen");
    }
    console.log("Sending the types of files", uploadFileTypes);
    postMessage({
      event: "fileTypesToUpload",
      data: uploadFileTypes,
    });
  };
}

function consolidateFiles(meetingId: string, userId: string) {
  if (!dbInstance) {
    console.error("DB not ready yet! ");
    return;
  }

  const tx = dbInstance.transaction("Recordings", "readwrite");
  const store = tx.objectStore("Recordings");
  const getRequest = store.get(meetingId);
  getRequest.onsuccess = (msg) => {
    const audioChunks: Blob[] = getRequest.result.audioChunks;
    const videoChunks: Blob[] = getRequest.result.videoChunks;
    const screenChunks: Blob[] = getRequest.result.screenChunks;
    // const uploadFileTypes = [];
    // if (audioChunks.length > 0) {
    //   uploadFileTypes.push("audio");
    // }
    // if (videoChunks.length > 0) {
    //   uploadFileTypes.push("video");
    // }
    // if (screenChunks.length > 0) {
    //   uploadFileTypes.push("screen");
    // }
    // console.log("Sending the types of files", uploadFileTypes);
    // postMessage({
    //   event: "fileTypesToUpload",
    //   data: uploadFileTypes,
    // });

    if (screenChunks) {
      const object = getRequest.result;
      const consolidatedScreen = new Blob(screenChunks, {
        type: "video/webm;codecs=vp8,opus",
      });
      object.consolidatedScreen = consolidatedScreen;
      //  Save back updated data
      const putRequest = store.put(object);
      putRequest.onsuccess = async () => {
        console.log("Consolidated screen files, uploading to cloud");
        const screenShareFileName = getFinalFileName("SCREEN", userId);
        await saveToS3(
          consolidatedScreen,
          "SCREEN",
          screenShareFileName,
          meetingId,
          userId
        );
      };
      putRequest.onerror = (msg) => {
        console.error((msg.target as IDBOpenDBRequest).error);
      };
    }
    if (videoChunks) {
      const object = getRequest.result;
      const consolidatedVideo = new Blob(videoChunks, {
        type: "video/webm;codecs=vp8",
      });
      object.FinalVideo = consolidatedVideo;
      const putRequest = store.put(object);
      putRequest.onsuccess = async () => {
        console.log("Consolidated video file, uploading to cloud");
        const finalVideoFileName = getFinalFileName("VIDEO", userId);
        await saveToS3(
          consolidatedVideo,
          "VIDEO",
          finalVideoFileName,
          meetingId,
          userId
        );
        const thumbnailFileName = getFinalFileName("THUMBNAIL", userId);
        const thumbnail = await generateThumbnail(consolidatedVideo);
        console.log("Consolidated thumbnail file, uploading to cloud");
        await saveToS3(
          thumbnail,
          "THUMBNAIL",
          thumbnailFileName,
          meetingId,
          userId
        );
      };
      putRequest.onerror = (msg) => {
        console.error((msg.target as IDBOpenDBRequest).error);
      };
    }
    if (audioChunks) {
      const object = getRequest.result;
      const consolidatedAudio = new Blob(audioChunks, {
        type: "audio/webm;codecs=opus",
      });
      object.FinalAudio = consolidatedAudio;
      const putRequest = store.put(object);
      putRequest.onsuccess = async () => {
        console.log("Consolidated audio file, uploading to cloud");
        const finalAudioFileName = getFinalFileName("AUDIO", userId);
        await saveToS3(
          consolidatedAudio,
          "AUDIO",
          finalAudioFileName,
          meetingId,
          userId
        );
      };
      putRequest.onerror = (msg) => {
        console.error((msg.target as IDBOpenDBRequest).error);
      };
    }
  };
}

async function getFFmpeg() {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
    ffmpegReady = true;
    console.log("[Worker] FFmpeg loaded once and ready");
  } else if (!ffmpegReady) {
    // if another call is waiting for load
    await new Promise((resolve) => {
      const check = () => {
        if (ffmpegReady) resolve(null);
        else setTimeout(check, 100);
      };
      check();
    });
  }
  return ffmpeg;
}
//Function to get a thumbnail
async function generateThumbnail(file: Blob) {
  const ffmpeg = await getFFmpeg();

  await ffmpeg.load();

  await ffmpeg.writeFile("input.mp4", await fetchFile(file));
  await ffmpeg.exec([
    "-i",
    "input.mp4",
    "-ss",
    "00:00:10",
    "-vframes",
    "1",
    "thumb.jpg",
  ]);
  const data = await ffmpeg.readFile("thumb.jpg");
  return new Blob([new Uint8Array(data as Uint8Array)], { type: "image/jpeg" });
}

//Function to get the final video file name
function getFinalFileName(
  type: "VIDEO" | "AUDIO" | "THUMBNAIL" | "SCREEN",
  userId: string
): string {
  if (type == "VIDEO") {
    return userId + "_" + "VIDEO";
  } else if (type == "AUDIO") {
    return userId + "_" + "AUDIO";
  } else if (type == "THUMBNAIL") {
    return userId + "_" + "THUMBNAIL";
  } else {
    return userId + "_" + "SCREEN";
  }
}

//Function to save the final consolidated files to the s3 bucket.
async function saveToS3(
  finalFile: Blob,
  type: string,
  fileName: string,
  meetingId: string,
  userId: string
) {
  try {
    if (finalFile.size <= 0) {
      console.log("THE FILE SIZE IS 0, skipping");
      return;
    }
    // check finalFile size if it is less than 10MB
    if (finalFile.size < 10000000) {
      // Call your API to get the presigned URL
      const response = await axios.post(
        `https://www.qwalpod.live/api/getSinglePresignedURL`,
        {
          fileName: fileName,
          fileType: finalFile.type,
          meetingId: meetingId,
        }
      );
      const { url } = response.data;
      console.log("The presigned url is", url);
      // Use the presigned URL to upload the finalFile
      try {
        const uploadResponse = await axios.put(url, finalFile, {
          headers: {
            "Content-Type": finalFile.type,
            "x-amz-acl": "public-read",
          },
        });

        if (uploadResponse.status === 200) {
          console.log(`${type} uploaded successfully.`);

          //Add the fileKey of the audio file and the video file to the database table Recording.
          try {
            const addFileKeyToDbRes = await axios.post(
              "https://www.qwalpod.live/api/dbRecord/addFileURL",
              {
                meetingId: meetingId,
                userId: userId,
                fileType: type,
                fileKey: `${meetingId}/${fileName}`,
              }
            );
            console.log("File Key added to database", addFileKeyToDbRes.data);
            console.log(
              `sending messages of COMPLETION OF ${type} FILE UPLOADS`
            );
            postMessage({
              event: "FileUploadSuccessful",
              fileType: type.toLowerCase(),
            });
          } catch (e) {
            console.error("Error uploading file data to db", e);
          }
        } else {
          console.log("Upload failed. the reason is", uploadResponse.data);
        }
      } catch (uploadError) {
        console.error("Upload request failed:", uploadError);
        if (axios.isAxiosError(uploadError)) {
          console.error("Response data:", uploadError.response?.data);
          console.error("Response status:", uploadError.response?.status);
        }
      }
    } else {
      // call multipart upload endpoint and get uploadId
      const response = await axios.post(
        `https://www.qwalpod.live/api/startMultipartUpload`,
        {
          fileName: fileName,
          contentType: type,
          meetingId: meetingId as string,
        }
      );

      // get uploadId
      let { uploadId } = response.data;
      console.log("UploadId- ", uploadId);

      // get total size of the finalFile
      let totalSize = finalFile.size;
      // set chunk size to 10MB
      let chunkSize = 10000000;
      // calculate number of chunks
      let numChunks = Math.ceil(totalSize / chunkSize);

      console.log("Total file size:", totalSize);
      console.log("Chunk size:", chunkSize);
      console.log("Number of chunks:", numChunks);

      // generate presigned urls
      let presignedUrls_response = await axios.post(
        `https://www.qwalpod.live/api/getPresignedURLs`,
        {
          fileName: fileName,
          uploadId: uploadId,
          partNumbers: numChunks,
          fileType: finalFile.type,
          meetingId: meetingId,
        }
      );

      let presigned_urls = presignedUrls_response?.data?.presignedUrls;

      console.log("Presigned urls- ", presigned_urls);

      // upload the finalFile into chunks to different presigned url
      let parts: any = [];
      const uploadPromises = [];
      for (let i = 0; i < numChunks; i++) {
        let start = i * chunkSize;
        let end = Math.min(start + chunkSize, totalSize);
        let chunk = finalFile.slice(start, end);
        let presignedUrl = presigned_urls[i];
        try {
          uploadPromises.push(
            axios.put(presignedUrl, chunk, {
              headers: {
                "Content-Type": finalFile.type,
                // "x-amz-acl": "public-read",
              },
            })
          );
        } catch (e) {
          console.log("Error occured while pushing", e);
        }
      }

      const uploadResponses = await Promise.all(uploadPromises);
      console.log("THe upload response is", uploadResponses);
      uploadResponses.forEach((response, i) => {
        // existing response handling
        if (!response) {
          return;
        }

        parts.push({
          etag: response.headers.etag,
          PartNumber: i + 1,
        });
      });

      console.log("Parts- ", parts);

      // make a call to multipart complete api
      let complete_upload = await axios.post(
        `https://www.qwalpod.live/api/completeMultipartUpload`,
        {
          fileName: fileName,
          uploadId: uploadId,
          parts: parts,
          meetingId: meetingId,
        }
      );

      console.log("Complete upload- ", complete_upload.data);

      // if upload is successful, alert user
      if (complete_upload.status === 200) {
        console.log(`sending messages of COMPLETION OF ${type} FILE UPLOADS`);
        postMessage({
          event: "FileUploadSuccessful",
          fileType: type.toLowerCase(),
        });
        try {
          const addFileKeyToDbRes = await axios.post(
            "https://www.qwalpod.live/api/dbRecord/addFileURL",
            {
              meetingId: meetingId,
              userId: userId,
              fileType: type,
              fileKey: `${meetingId}/${fileName}`,
            }
          );
          console.log("File Key added to database", addFileKeyToDbRes.data);
        } catch (e) {
          console.error("Error uploading file data to db", e);
        }
      } else {
        alert("Upload failed.");
      }
    }
  } catch (error) {
    console.error("Upload failed.");
  }
}

// Save incoming audio/video chunk
function saveChunk(
  meetingId: string,
  type: "audio" | "video" | "screen",
  chunk: Blob
) {
  if (!dbInstance) {
    console.error("DB not ready yet!");
    return;
  }
  const tx = dbInstance.transaction("Recordings", "readwrite");
  const store = tx.objectStore("Recordings");
  const getRequest = store.get(meetingId);

  getRequest.onsuccess = () => {
    interface MeetingData {
      meetingId: string;
      audioChunks: Blob[];
      videoChunks: Blob[];
      screenChunks: Blob[];
    }

    let data: MeetingData | undefined = getRequest.result;

    //  If meeting not found, auto-create the structure
    if (!data) {
      console.warn(`[Worker] Auto-creating meeting ${meetingId}`);
      data = {
        meetingId,
        audioChunks: [],
        videoChunks: [],
        screenChunks: [],
      };
    }

    //  Append chunk to proper array
    if (type === "audio") {
      data.audioChunks.push(chunk);
    } else if (type == "video") {
      console.log("Trying to save the video chunk ", chunk);
      data.videoChunks.push(chunk);
    } else {
      console.log("Trying to save the screenChunk");
      data.screenChunks.push(chunk);
    }

    //  Save back updated data
    const putRequest = store.put(data);

    putRequest.onsuccess = () => {};

    putRequest.onerror = (e) => {
      console.error(
        "Failed to save chunk :",
        (e.target as IDBOpenDBRequest).error
      );
    };
  };

  getRequest.onerror = () => {
    console.error("Failed to fetch meeting data :", getRequest.error);
  };
}

// Handle messages from main thread
self.onmessage = (msg) => {
  const { event, roomId, type, chunk } = msg.data;
  if (event == "saveChunk") {
    saveChunk(roomId, type, chunk);
  }
  if (event == "consolidateFile") {
    console.log("Received the consolidate files request from the FE");
    consolidateFiles(roomId, msg.data.userId);
  }
  if (event == "getUploadFileTypes") {
    getUploadFileTypes(roomId);
  }
};
