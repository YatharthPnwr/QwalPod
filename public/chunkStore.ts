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
  };
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
    if (type == "video") {
      console.log("Msg to save received");
    }
    saveChunk(roomId, type, chunk);
  }
  if (event == "consolidateFile") {
    consolidateFiles(roomId);
  }
};
