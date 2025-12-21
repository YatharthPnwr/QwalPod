import axios from "axios";
const dbName = "qwalPod";
// Open DB as soon as the worker loads
const dbRequest = indexedDB.open(dbName, 1);
let dbInstance: IDBDatabase | null = null;

dbRequest.onupgradeneeded = (event) => {
  const db = (event.target as IDBOpenDBRequest).result;
  let objectStore;
  if (!db.objectStoreNames.contains("Recordings")) {
    objectStore = db.createObjectStore("Recordings", { keyPath: "id" });
    objectStore.createIndex("MeetingChunkType", ["meetingId", "type"]);
    objectStore.createIndex("userIdMeetingChunkStatus", [
      "userId",
      "meetingId",
      "uploadStatus",
    ]);
    objectStore.createIndex("ChunkStatusMeeting", [
      "uploadStatus",
      "meetingId",
    ]);
    objectStore.createIndex("userIdMeetingId", ["userId", "meetingId"]);
  }
};

dbRequest.onsuccess = () => {
  dbInstance = dbRequest.result;
  postMessage({
    event: "IndexedDbOpenedSuccessfully",
  });
  console.log("[Worker] IndexedDB opened successfully ");
};

dbRequest.onerror = () => {
  console.error("[Worker] Failed to open IndexedDB :", dbRequest.error);
};

interface ChunkMetaData {
  id: string;
  userId: string;
  segmentNumber: number; //For audio and video chunks
  screenShareSegmentNumber?: number; //For screenShare chunks
  chunk: Blob;
  type: "screen" | "video" | "audio";
  meetingId: string;
  uploadStatus: "left" | "uploading" | "uploaded";
  chunkName: string;
  chunkNumber: number;
}

//Get chunk number for a type
async function getLatestChunkNumberForaType(
  type: "screen" | "video" | "audio",
  meetingId: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!dbInstance) {
      reject("DB not ready yet!");
      return;
    }
    //Define the dbInstance for the txn
    const tx1 = dbInstance.transaction("Recordings", "readonly");
    //Define the store you want to perform the db txn on
    const store = tx1.objectStore("Recordings");
    //Get the meetingIndex
    let MeetingChunkType = store.index("MeetingChunkType");
    //Latest number for the type
    const chunkRequest = MeetingChunkType.count([meetingId, type]);

    chunkRequest.onsuccess = () => {
      const chunkNumber = chunkRequest.result + 1;
      resolve(chunkNumber);
    };
    chunkRequest.onerror = (e) => {
      console.log("[Worker] Failed to process the chunkRequest");
      reject(e);
      return;
    };
  });
}

//get name of a chunk name
function getChunkName(type: "screen" | "video" | "audio", chunkNumber: number) {
  //After you have the chunk number, find the name
  const paddingZeros = 5 - chunkNumber.toString().length;
  let name = type + "_";
  for (let index = 0; index < paddingZeros; index++) {
    name += "0";
  }
  name += chunkNumber;
  return name;
}

//Save the chunk directly to s3
async function saveToS3(
  chunkMetaData: ChunkMetaData,
  userId: string,
  segmentNumber: number
) {
  console.log("The file being uploaded is", chunkMetaData.chunk);
  if (chunkMetaData.chunk.size < 10000000) {
    // check finalFile size if it is less than 10MB
    // Call your API to get the presigned URL
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/getSinglePresignedURL`,
      {
        fileName: chunkMetaData.chunkName,
        fileCategory: chunkMetaData.type,
        fileType:
          chunkMetaData.type == "video" || chunkMetaData.type == "screen"
            ? "video/webm"
            : "audio/webm",
        meetingId: chunkMetaData.meetingId,
        userId: userId,
        segmentNumber: segmentNumber,
      }
    );
    const { url } = response.data;
    console.log("The presigned url is", url);
    // Use the presigned URL to upload the finalFile
    try {
      const uploadResponse = await axios.put(url, chunkMetaData.chunk, {
        headers: {
          "Content-Type":
            chunkMetaData.type == "video" || chunkMetaData.type == "screen"
              ? "video/webm"
              : "audio/webm",
          "x-amz-acl": "public-read",
        },
      });

      if (uploadResponse.status === 200) {
        console.log(`${chunkMetaData} chunk uploaded successfully.`);

        //Add the fileKey of the audio file and the video file to the database table Recording.

        try {
          const addFileKeyToDbRes = await axios.post(
            `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/dbRecord/addFileURL`,
            {
              meetingId: chunkMetaData.meetingId,
              userId: userId,
              fileType: chunkMetaData.type,
              fileKey: `${chunkMetaData.meetingId}/${userId}/${chunkMetaData.type}/${chunkMetaData.segmentNumber}/${chunkMetaData.chunkName}`,
            }
          );
          console.log(
            "Chunk File Key added to database",
            addFileKeyToDbRes.data
          );
        } catch (e) {
          console.error("Error uploading file data to db", e);
        }
        try {
          await updateChunkStatus(chunkMetaData, "uploaded");
        } catch (e) {
          throw new Error("Failed updating the chunk Status");
        }
      } else {
        throw new Error("Upload failed. the reason is", uploadResponse.data);
      }
    } catch (uploadError) {
      if (axios.isAxiosError(uploadError)) {
        throw new Error(`Response data:, ${uploadError.response?.data}`);
      }
      throw new Error(`Upload request failed: ${uploadError}`);
    }
  } else {
    console.log("Doing a multipart upload");
    // call multipart upload endpoint and get uploadId
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/startMultipartUpload`,
      {
        fileName: chunkMetaData.chunkName,
        fileType: chunkMetaData.type,
        contentType:
          chunkMetaData.type == "video" || chunkMetaData.type == "screen"
            ? "video/webm"
            : "audio/webm",
        meetingId: chunkMetaData.meetingId,
        userId: userId,
        segmentNumber: segmentNumber,
      }
    );

    // get uploadId
    let { uploadId } = response.data;
    console.log("UploadId for the multiparts upload is -", uploadId);

    // get total size of the finalFile
    let totalSize = chunkMetaData.chunk.size;
    // set chunk size to 10MB
    let chunkSize = 10000000;
    // calculate number of chunks
    let numChunks = Math.ceil(totalSize / chunkSize);

    console.log("Total file size:", totalSize);
    console.log("Chunk size:", chunkSize);
    console.log("Number of chunks:", numChunks);

    // generate presigned urls
    let presignedUrls_response = await axios.post(
      `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/getPresignedURLs`,
      {
        fileName: chunkMetaData.chunkName,
        uploadId: uploadId,
        partNumbers: numChunks,
        meetingId: chunkMetaData.meetingId,
        userId: userId,
        fileType: chunkMetaData.type,
        segmentNumber: segmentNumber,
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
      let chunk = chunkMetaData.chunk.slice(start, end);
      let presignedUrl = presigned_urls[i];
      try {
        uploadPromises.push(
          axios.put(presignedUrl, chunk, {
            headers: {
              "Content-Type":
                chunkMetaData.type == "video" || chunkMetaData.type == "screen"
                  ? "video/webm"
                  : "audio/webm",
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
      `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/completeMultipartUpload`,
      {
        fileName: chunkMetaData.chunkName,
        uploadId: uploadId,
        parts: parts,
        meetingId: chunkMetaData.meetingId,
        userId: userId,
        fileType: chunkMetaData.type,
        segmentNumber: segmentNumber,
      }
    );

    console.log("Complete upload- ", complete_upload.data);

    // if upload is successful, alert user
    if (complete_upload.status === 200) {
      //This will break
      console.log(
        `sending messages of COMPLETION OF ${chunkMetaData.type} FILE UPLOADS`
      );
      postMessage({
        event: "FileUploadSuccessful",
        fileType: chunkMetaData.type.toLowerCase(),
      });
      try {
        const addFileKeyToDbRes = await axios.post(
          `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/dbRecord/addFileURL`,
          {
            meetingId: chunkMetaData.meetingId,
            userId: userId,
            fileType: chunkMetaData.type,
            fileKey: `${chunkMetaData.meetingId}/${userId}/${chunkMetaData.type}/${chunkMetaData.segmentNumber}/${chunkMetaData.chunkName}`,
          }
        );
        console.log("Chunk File Key added to database", addFileKeyToDbRes.data);
      } catch (e) {
        console.error("Error uploading file data to db", e);
      }
      return;
    } else {
      alert("Upload failed.");
      return;
    }
  }
}

let uploadingChunk: boolean = false;
//start upload chunks of current meeting
async function startUploadingMeetingChunks(meetingId: string, userId: string) {
  while (true) {
    try {
      //Check if uploading is going on
      if (uploadingChunk) {
        console.log("Still uploading another chunks waiting");
        const wait5Sec = () => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              console.log(
                "Waited for 5 seconds checking again for any unuploaded chunks"
              );
              resolve();
            }, 5000);
          });
        };
        await wait5Sec();
        continue;
      }
      //get 1 unuploaded chunk in the meeting.
      const unuploadedChunk = await getUnuploadedChunk(meetingId, userId);
      if (!unuploadedChunk) {
        //if there are none, then the full meeting has been uploaded yayyy!
        console.log(
          "All chunks have been successfully uploaded to the s3 bucket"
        );
        const wait3Sec = () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              console.log(
                "Waited for 3 seconds checking again for any unuploaded chunks"
              );
              resolve("");
            }, 3000);
          });
        };
        await wait3Sec();
        continue;
      }

      console.log(`[Worker] Uploading chunk:`, unuploadedChunk);

      // Set upload flag and update status
      uploadingChunk = true;
      await updateChunkStatus(unuploadedChunk, "uploading");

      try {
        // Upload the chunk
        if (unuploadedChunk.screenShareSegmentNumber) {
          await saveToS3(
            unuploadedChunk,
            userId,
            unuploadedChunk.screenShareSegmentNumber
          );
        } else {
          await saveToS3(
            unuploadedChunk,
            userId,
            unuploadedChunk.segmentNumber
          );
        }
        console.log(
          `[Worker] Successfully uploaded: ${unuploadedChunk.chunkName}`
        );
      } catch (uploadError) {
        console.error(
          `[Worker] Upload failed for ${unuploadedChunk.chunkName}:`,
          uploadError,
          "changing the status back to left"
        );

        await updateChunkStatus(unuploadedChunk, "left");
      }
    } catch (error) {
      console.error("[Worker] Error in upload loop:", error);
    } finally {
      uploadingChunk = false;
    }
  }
}

// Save incoming audio/video chunk
async function saveChunk(
  id: string,
  userId: string,
  meetingId: string,
  segmentNumber: number,
  type: "audio" | "video" | "screen",
  chunk: Blob,
  screenShareSegmentNumber?: number
) {
  if (!dbInstance) {
    console.error("DB not ready yet!");
    return;
  }
  console.log("Trying to save the chunk type, ", type);
  const chunkNumber = await getLatestChunkNumberForaType(type, meetingId);
  const name = getChunkName(type, chunkNumber);
  //Create the chunk metadata and store the record in the DB
  const chunkMetaData: ChunkMetaData = {
    id: id,
    userId: userId,
    segmentNumber: segmentNumber,
    chunk: chunk,
    type: type,
    screenShareSegmentNumber: screenShareSegmentNumber,
    meetingId: meetingId,
    uploadStatus: "left",
    chunkName: name,
    chunkNumber: chunkNumber,
  };
  //Save the chunk to indexed DB
  const tx = dbInstance.transaction("Recordings", "readwrite");
  const store = tx.objectStore("Recordings");
  const addReq = store.add(chunkMetaData);
  addReq.onsuccess = async () => {
    // console.log("[Worker] The ", type, "chunk was stored in the db");
  };
}

//Get an unuploaded chunk
async function getUnuploadedChunk(
  meetingId?: string,
  userId?: string
): Promise<ChunkMetaData> {
  return new Promise((resolve, reject) => {
    if (!dbInstance) {
      console.log(
        "[WORKER] GetUnuploadedChunk failed because dbInstance was not found"
      );
      reject(
        "[WORKER] GetUnuploadedChunk failed because dbInstance was not found"
      );
      return;
    }
    if (meetingId && userId) {
      //Return the latest chunk that is unuploaded from this meeting Id
      //create a tx to open the indexed db
      const tx1 = dbInstance.transaction("Recordings", "readonly");
      //Open the store.
      const store = tx1.objectStore("Recordings");
      //Get the index on the store to search
      const userIdMeetingChunkStatus = store.index("userIdMeetingChunkStatus");
      //Find the chunk with meetingId = meetingId and chunkMetaData.uploadStatus = "left"
      const unuploadedChunkReq = userIdMeetingChunkStatus.get([
        userId,
        meetingId,
        "left",
      ]);
      unuploadedChunkReq.onsuccess = () => {
        const unuploadedChunk = unuploadedChunkReq.result;
        resolve(unuploadedChunk);
      };
      //Return that chunk
    } else {
      //Return the latest chunk that is unuploaded from any meetingId
      //create a tx to open the indexed db
      const tx1 = dbInstance.transaction("Recordings", "readonly");
      //Open the store.
      const store = tx1.objectStore("Recordings");
      //get the status first index
      const statusFirstIndex = store.index("ChunkStatusMeeting");
      const firstLeftChunkReq = statusFirstIndex.get(
        IDBKeyRange.bound(["left", ""], ["left", "\uffff"])
      );
      firstLeftChunkReq.onsuccess = () => {
        const firstLeftChunk = firstLeftChunkReq.result;
        console.log("Found an un uploaded chunk", firstLeftChunk);
        resolve(firstLeftChunk);
      };
      firstLeftChunkReq.onerror = (e) => {
        reject("Failed getting unuploaded chunk");
        return;
      };
    }
  });
}

//Update the status of a chunk
async function updateChunkStatus(
  chunkMetaData: ChunkMetaData,
  updatedStatus: "left" | "uploading" | "uploaded"
): Promise<string> {
  return new Promise((resolve, reject) => {
    //Set the status of the chunk to uploaded
    if (!dbInstance) {
      console.log("NO WEB WORKER FOUND RETURNING");
      reject(
        "[WORKER] Updating chunk status failed because no webWorker was found"
      );
      return;
    }
    const tx = dbInstance.transaction("Recordings", "readwrite");
    const store = tx.objectStore("Recordings");
    const getRequest = store.get(chunkMetaData.id);
    getRequest.onsuccess = () => {
      const existingData: ChunkMetaData = getRequest.result;
      // existingData now contains the chunk metadata (if it exists)
      existingData.uploadStatus = updatedStatus;
      const putRequest = store.put(existingData);
      putRequest.onsuccess = () => {
        console.log("status set to", updatedStatus, "for chunk", chunkMetaData);
        resolve("updated chunk status successfully");
      };

      putRequest.onerror = (e) => {
        reject("Failed to save chunk");
        return;
      };
    };
  });
}

//Function to get the Segment number for a userId and meetingId
async function getSegmentNumber(
  roomId: string,
  userId: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    //get the heighest segmentNumber for particular roomid and userId
    //Add 1 to it and then return
    if (!dbInstance) {
      console.log("[WORKER] No dbInstance found returning");
      reject("[WORKER] No dbInstance returning");
      return;
    }
    const tx = dbInstance.transaction("Recordings", "readonly");
    const store = tx.objectStore("Recordings");
    const userIdMeetingId = store.index("userIdMeetingId");
    const getChunksReq = userIdMeetingId.getAll([userId, roomId]);
    getChunksReq.onsuccess = () => {
      const chunks = getChunksReq.result;
      let heighestNum = 0;
      if (chunks.length === 0 || !chunks) {
        resolve(heighestNum + 1);
        return;
      }
      chunks.forEach((chunk: ChunkMetaData) => {
        if (chunk.segmentNumber > heighestNum) {
          heighestNum = chunk.segmentNumber;
        }
      });
      resolve(heighestNum + 1);
    };
    getChunksReq.onerror = () => {
      reject("Failed to fetch the chunks to get segment number");
    };
  });
}

async function getScreenShareSegmentNumber(roomId: string, userId: string) {
  return new Promise((resolve, reject) => {
    //get the heighest segmentNumber for particular roomid and userId
    //Add 1 to it and then return
    if (!dbInstance) {
      console.log("[WORKER] No webWorkerFound returning");
      reject("[WORKER] No webWorkerFound returning");
      return;
    }
    const tx = dbInstance.transaction("Recordings", "readonly");
    const store = tx.objectStore("Recordings");
    const userIdMeetingId = store.index("userIdMeetingId");
    const getChunksReq = userIdMeetingId.getAll([userId, roomId]);
    getChunksReq.onsuccess = () => {
      const chunks = getChunksReq.result;
      let heighestNum = 0;
      if (chunks.length === 0 || !chunks) {
        resolve(heighestNum + 1);
        return;
      }
      chunks.forEach((chunk: ChunkMetaData) => {
        if (
          chunk.screenShareSegmentNumber &&
          chunk.screenShareSegmentNumber > heighestNum
        ) {
          heighestNum = chunk.screenShareSegmentNumber;
        }
      });
      resolve(heighestNum + 1);
    };
    getChunksReq.onerror = () => {
      reject("Failed to fetch the chunks to get segment number");
    };
  });
}

// Handle messages from main thread
self.onmessage = async (msg) => {
  const event = msg.data.event;
  // console.log("The event receied by the webworker is ", event);
  if (event == "saveChunk") {
    // console.log("Saving the chunk");
    if (
      !msg.data.id ||
      !msg.data.roomId ||
      !msg.data.type ||
      !msg.data.chunk ||
      !msg.data.userId
    ) {
      console.log("MISSING BODY ARGUMENTS RETURNING");
      return;
    }
    const { id, roomId, type, chunk, userId, segmentNumber } = msg.data;
    if (msg.data.screenShareSegmentNumber) {
      //This is a screen chunk
      await saveChunk(
        id,
        userId,
        roomId,
        segmentNumber,
        type,
        chunk,
        msg.data.screenShareSegmentNumber
      );
    } else {
      await saveChunk(id, userId, roomId, segmentNumber, type, chunk);
    }
  }
  if (event == "getSegmentNumber") {
    const { roomId, userId } = msg.data;
    const segmentNumber = await getSegmentNumber(roomId, userId);
    postMessage({
      audioAndVideoSegmentNumber: segmentNumber,
      event: "audioAndVideoSegment",
    });
    startUploadingMeetingChunks(roomId, userId);
  }
  if (event == "getScreenShareSegmentNumber") {
    const { roomId, userId } = msg.data;
    const segmentNumber = await getScreenShareSegmentNumber(roomId, userId);
    postMessage({
      screenShareSegmentNumber: segmentNumber,
      event: "screenSegmentNumber",
    });
  }
  if (event == "closeDB") {
    console.log("Closing the db");
    dbInstance?.close();
  }
};
