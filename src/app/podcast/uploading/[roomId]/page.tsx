"use client";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Upload() {
  const { userRole, ws, webWorkerRef } = useApplicationContext();
  const router = useRouter();
  const params = useParams();

  const [fileTypeToUpload, setFileTypesToUpload] = useState<Record<
    string,
    boolean
  > | null>(null);
  // const allCompleted = Object.values(fileTypeToUpload).every(Boolean);
  const meetingId = params.roomId;
  useEffect(() => {
    console.log("updated state of file type upload", fileTypeToUpload);

    // Object.keys(fileTypeToUpload).forEach
    if (fileTypeToUpload) {
      for (const key in fileTypeToUpload) {
        if (fileTypeToUpload[key] == false) {
          return;
        }
      }

      router.push(`/dashboard/recordings/${meetingId}`);
    }
  }, [fileTypeToUpload]);

  useEffect(() => {
    if (!webWorkerRef.current) {
      console.log("No webworker found ");
      return;
    } else {
      // assign the message handler instead of invoking it
      webWorkerRef.current.onmessage = (event: MessageEvent) => {
        console.log("The message received is,", event.data);
        // setUploadStatus(true);
        if (event.data.event == "fileTypesToUpload") {
          console.log("File types to upload are", event.data.event);
          const initialStatus = Object.fromEntries(
            event.data.data.map((e: string) => [e, false])
          );
          initialStatus["thumbnail"] = false;
          console.log("The initial file status is", initialStatus);
          // setFileTypesToUpload(initialStatus);
          setFileTypesToUpload(initialStatus);
          // fileTypeToUpload.current = initialStatus;
        }
        if (event.data.event == "FileUploadSuccessful") {
          const type = event.data.fileType;
          // fileTypeToUpload.current[type] = true;
          setFileTypesToUpload((pre) => ({ ...pre, [type]: true }));
        }
      };

      webWorkerRef.current.postMessage({
        event: "getUploadFileTypes",
        roomId: localStorage.getItem("roomId"),
      });
    }

    // cleanup handler on unmount
    return () => {
      if (webWorkerRef.current) {
        webWorkerRef.current.onmessage = null;
      }
    };
  }, [webWorkerRef]);

  return (
    <>
      {fileTypeToUpload && (
        <>
          <div>UPLOADING FILES </div>
          {fileTypeToUpload["audio"] && <div>Audio Done</div>}
          {fileTypeToUpload["video"] && <div>Video Done</div>}
          {fileTypeToUpload["thumbnail"] && <div>Thumbnail Done</div>}
          {fileTypeToUpload["screen"] && <div>Screen Done</div>}
          {/* {allCompleted && <div>All complete</div>} */}
        </>
      )}
    </>
  );
}
