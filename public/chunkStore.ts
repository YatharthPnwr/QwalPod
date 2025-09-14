import axios from "axios";
const dbName = "qwalPod";
let dbInstance: IDBDatabase | null = null;

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

function consolidateFiles(meetingId: string) {
  if (!dbInstance) {
    console.error("DB not ready yet! ");
    return;
  }
  const tx = dbInstance.transaction("Recordings", "readwrite");
  const store = tx.objectStore("Recordings");
  const getRequest = store.get(meetingId);
  getRequest.onsuccess = (msg) => {
    const audioChunks = getRequest.result.audioChunks;
    const videoChunks = getRequest.result.videoChunks;
    const consolidatedVideo = new Blob(videoChunks, {
      type: "video/webm;codecs=vp8",
    });
    const consolidatedAudio = new Blob(audioChunks, {
      type: "audio/webm;codecs=opus",
    });
    const object = getRequest.result;
    object.FinalVideo = consolidatedVideo;
    object.FinalAudio = consolidatedAudio;

    //  Save back updated data
    const putRequest = store.put(object);

    putRequest.onsuccess = async () => {
      console.log(
        "The saving of consolidated files is done, proceeding to upload the videos to the cloud"
      );
      const finalVideoFileName = getFinalFileName("VIDEO", meetingId);
      const finalAudioFileName = getFinalFileName("AUDIO", meetingId);
      await saveToS3(consolidatedVideo, "VIDEO", finalVideoFileName);
      await saveToS3(consolidatedAudio, "AUDIO", finalAudioFileName);
    };
    putRequest.onerror = (msg) => {
      console.error((msg.target as IDBOpenDBRequest).error);
    };
  };
}
//Function to get the final video file name
function getFinalFileName(type: "VIDEO" | "AUDIO", meetingId: string): string {
  if (type == "VIDEO") {
    return meetingId + "_" + "VIDEO";
  } else {
    return meetingId + "_" + "AUDIO";
  }
}

//Function to save the final consolidated files to the s3 bucket.
async function saveToS3(finalFile: Blob, type: string, fileName: string) {
  try {
    // check finalFile size if it is less than 10MB
    if (finalFile.size < 10000000) {
      // Call your API to get the presigned URL
      const response = await axios.post(`/api/getSinglePresignedURL`, {
        fileName: fileName,
        fileType: finalFile.type,
      });
      const { url } = response.data;
      console.log("The url is", url);
      console.log("The uploaded file type is", finalFile.type);
      // Use the presigned URL to upload the finalFile
      try {
        const uploadResponse = await axios.put(url, finalFile, {
          headers: {
            "Content-Type": finalFile.type,
            "x-amz-acl": "public-read",
          },
        });

        console.log("Uplaodresponse- ", uploadResponse);

        if (uploadResponse.status === 200) {
          console.log("finalFile uploaded successfully.");
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
      const response = await axios.post(`/api/startMultipartUpload`, {
        fileName: fileName,
        contentType: type,
      });

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
      let presignedUrls_response = await axios.post(`/api/getPresignedURLs`, {
        fileName: fileName,
        uploadId: uploadId,
        partNumbers: numChunks,
        fileType: finalFile.type,
      });

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
      let complete_upload = await axios.post(`/api/completeMultipartUpload`, {
        fileName: fileName,
        uploadId: uploadId,
        parts: parts,
      });

      console.log("Complete upload- ", complete_upload.data);

      // if upload is successful, alert user
      if (complete_upload.status === 200) {
        console.log("finalFile uploaded successfully.");
      } else {
        alert("Upload failed.");
      }
    }
  } catch (error) {
    console.error("Upload failed.");
  }
}

// Save incoming audio/video chunk
function saveChunk(meetingId: string, type: "audio" | "video", chunk: Blob) {
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
    }

    let data: MeetingData | undefined = getRequest.result;

    //  If meeting not found, auto-create the structure
    if (!data) {
      console.warn(`[Worker] Auto-creating meeting ${meetingId}`);
      data = {
        meetingId,
        audioChunks: [],
        videoChunks: [],
      };
    }

    //  Append chunk to proper array
    if (type === "audio") {
      data.audioChunks.push(chunk);
    } else {
      console.log("Trying to save the video chunk ", chunk);
      data.videoChunks.push(chunk);
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
    consolidateFiles(roomId);
  }
};
