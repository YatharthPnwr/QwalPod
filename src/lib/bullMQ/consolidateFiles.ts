import * as dotenv from "dotenv";
dotenv.config();
import { Worker } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { mkdir } from "fs/promises";
import { Readable } from "stream";
import { finished } from "stream/promises";
import ffmpeg from "ffmpeg";

interface finalAudioChunkKeys {
  audioChunkKeys: {
    [segmentNumber: number]: string[];
  };
}

interface finalVideoChunkKeys {
  videoChunkKeys: {
    [segmentNumber: number]: string[];
  };
}

interface finalScreenAudioAndVideoChunkKeys {
  screenChunkKeys: {
    [segmentNumber: number]: string[];
  };
}
interface getAllFileAccessURLResponse {
  audioChunkSegments: finalAudioChunkKeys;
  videoChunkSegments: finalVideoChunkKeys;
  screenChunkSegments: finalScreenAudioAndVideoChunkKeys;
}

const connection = new IORedis({ maxRetriesPerRequest: null });

const worker = new Worker(
  "consolidateFiles",
  async (job) => {
    //JOB WILL CONTAIN the meetingID and the userID
    const userId = job.data.userId;
    const meetingId = job.data.meetingId;
    console.log("Runninng the worker for user", userId, "meeting", meetingId);
    //1. Fetch the getFileURLS for the meetingID and the userID
    try {
      const allChunkAccessURLsReq = await axios.post(
        `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/getAllFilesAccessURL`,
        {
          meetingId: meetingId,
          userId: userId,
        }
      );
      const allChunkAccessURLs: getAllFileAccessURLResponse =
        allChunkAccessURLsReq.data;
      console.dir("THE CHUNK URLS RECEIVED ARE,", allChunkAccessURLs);
      //2.map each media types segments and then chunks and then finally download each chunk in the fs in the same directory as mentioned
      //2.1 for each media type get the number of segments.
      //Iterate over each segment of that type and then fetch and save.
      const audioSegments = Object.keys(
        allChunkAccessURLs.audioChunkSegments.audioChunkKeys
      );
      const videoSegments = Object.keys(
        allChunkAccessURLs.videoChunkSegments.videoChunkKeys
      );
      const screenSegments = Object.keys(
        allChunkAccessURLs.screenChunkSegments.screenChunkKeys
      );
      console.log("The audioSegments keys are", audioSegments);
      console.log("The videoSegment keys are", videoSegments);
      console.log("The screenSegment keys are", screenSegments);

      console.log("Downloading the audio chunks");
      //Download Audio chunks
      await Promise.all(
        audioSegments.map(async (segment) => {
          //For each segment
          const fetchLinks =
            allChunkAccessURLs.audioChunkSegments.audioChunkKeys[
              Number(segment)
            ];
          //Save the chunk in the server
          await Promise.all(
            fetchLinks.map(async (link) => {
              const res = await fetch(link);
              if (!res.body) {
                console.log("NOTHING TO DOWNLOAD");
                return;
              }
              if (!fs.existsSync(`downloads/audio/${segment}`)) {
                await mkdir(`downloads/audio/${segment}`, { recursive: true });
              }
              const filename = getFileName(link);
              const destination = path.resolve(
                `./downloads/audio/${segment}`,
                filename
              );
              //Write the file to the filePath as in the link
              const fileStream = fs.createWriteStream(destination, {
                flags: "wx",
              });
              await finished(
                Readable.fromWeb(res.body as any).pipe(fileStream)
              );
            })
          );
        })
      );
      console.log("Downloading the video chunks");
      //Download Video chunks
      await Promise.all(
        videoSegments.map(async (segment) => {
          //For each segment
          const fetchLinks =
            allChunkAccessURLs.videoChunkSegments.videoChunkKeys[
              Number(segment)
            ];
          //Save the chunk in the server
          await Promise.all(
            fetchLinks.map(async (link) => {
              const res = await fetch(link);
              if (!res.body) {
                console.log("NOTHING TO DOWNLOAD");
                return;
              }
              if (!fs.existsSync(`downloads/video/${segment}`)) {
                await mkdir(`downloads/video/${segment}`, { recursive: true });
              }
              const filename = getFileName(link);
              const destination = path.resolve(
                `./downloads/video/${segment}`,
                filename
              );
              //Write the file to the filePath as in the link
              const fileStream = fs.createWriteStream(destination, {
                flags: "wx",
              });
              await finished(
                Readable.fromWeb(res.body as any).pipe(fileStream)
              );
            })
          );
        })
      );
      console.log("Downloading the screen chunks");
      //Download screen Chunks (if any)
      await Promise.all(
        screenSegments.map(async (segment) => {
          //For each segment
          const fetchLinks =
            allChunkAccessURLs.screenChunkSegments.screenChunkKeys[
              Number(segment)
            ];
          //Save the chunk in the server
          await Promise.all(
            fetchLinks.map(async (link) => {
              const res = await fetch(link);
              if (!res.body) {
                console.log("NOTHING TO DOWNLOAD");
                return;
              }
              if (!fs.existsSync(`downloads/screen/${segment}`)) {
                await mkdir(`downloads/screen/${segment}`, { recursive: true });
              }
              const filename = getFileName(link);
              const destination = path.resolve(
                `./downloads/audio/${segment}`,
                filename
              );
              //Write the file to the filePath as in the link
              const fileStream = fs.createWriteStream(destination, {
                flags: "wx",
              });
              await finished(
                Readable.fromWeb(res.body as any).pipe(fileStream)
              );
            })
          );
        })
      );

      //3. Make blobs of each segment number for audio, video and screen chunks, by accessing them from the filesystem.
      //DO IT FOR AUDIO
      console.log("MAKING THE AUDIO BLOB AND UPLOADING TO S3");
      await Promise.all(
        audioSegments.map(async (segment) => {
          const audioBlob: Blob[] = [];
          const files = fs.readdirSync(`./downloads/audio/${segment}`);
          await Promise.all(
            files.map(async (fileName) => {
              const file = await fs.openAsBlob(
                `./downloads/audio/${segment}/${fileName}`
              );
              audioBlob.push(file);
            })
          );
          //create a new blob and save it in the same folder as finalAudioFile
          const finalAudioBlob = new Blob(audioBlob);
          console.log("audio blob array is", audioBlob);
          try {
            const arrayBuffer = await finalAudioBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(
              `./downloads/audio/finalAudioBlob_${segment}.webm`,
              buffer
            );

            try {
              const convertProcess = await new ffmpeg(
                `./downloads/audio/finalAudioBlob_${segment}.webm`
              );
              // Convert .webm to .mp4 with compatible codecs
              //ffmpeg -i input.webm -vn -acodec libmp3lame -q:a 0 output.mp3
              convertProcess.fnExtractSoundToMP3;
              await convertProcess.save(
                `./downloads/audio/finalAudioBlob_${segment}.mp3`
              );
              await uploadBlobsToS3(
                meetingId,
                userId,
                "audio",
                "audio/mp3",
                Number(segment),
                `./downloads/audio/finalAudioBlob_${segment}.mp3`
              );
              await uploadBlobsToS3(
                meetingId,
                userId,
                "audio",
                "audio/mp3",
                Number(segment),
                `./downloads/audio/finalAudioBlob_${segment}.mp3`
              );
              //Add the filePath to the DB
              const filePath = `${meetingId}/${userId}/audio/${segment}/Final_audio_${segment}`;
              try {
                await axios.post(
                  `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/dbRecord/addFinalFileKeys`,
                  {
                    meetingId: meetingId,
                    userId: userId,
                    fileType: "audio",
                    segmentNum: Number(segment),
                    fileKey: filePath,
                  }
                );
              } catch (e) {
                console.log("Error in adding the filepath to db", e);
              }

              console.log("DONE UPLOADING THE FINAL SEGMENT AUDIO TO CLOUD");
            } catch (e) {
              console.log("Error occured in converting to mp4", e);
            }
          } catch (e) {
            console.log("Error occured in writing the final Audio file");
          }
        })
      );

      console.log("MAKING THE VIDEO BLOB AND UPLOADING TO S3");
      await Promise.all(
        videoSegments.map(async (segment) => {
          const videoBlob: Blob[] = [];
          const files = fs.readdirSync(`./downloads/video/${segment}`);
          await Promise.all(
            files.map(async (fileName) => {
              const file = await fs.openAsBlob(
                `./downloads/video/${segment}/${fileName}`
              );
              videoBlob.push(file);
            })
          );
          //create a new blob and save it in the same folder as finalAudioFile
          const finalVideoBlob = new Blob(videoBlob);
          console.log("video blob array is", videoBlob);
          try {
            const arrayBuffer = await finalVideoBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(
              `./downloads/video/finalVideoBlob_${segment}.webm`,
              buffer
            );
            //Convert the .webm file to mp3 file.
            try {
              const convertProcess = await new ffmpeg(
                `./downloads/video/finalVideoBlob_${segment}.webm`
              );
              // Convert .webm to .mp4 with compatible codecs
              convertProcess.setVideoFormat("mp4");
              // convertProcess.setVideoCodec("libx264"); // H.264 for video
              // convertProcess.setAudioCodec("aac"); // AAC for audio
              await convertProcess.save(
                `./downloads/video/finalVideoBlob_${segment}.mp4`
              );
              // const finalSegmentBuffer = Buffer.from(finalSegmentFileBuffer);
              await uploadBlobsToS3(
                meetingId,
                userId,
                "video",
                "video/mp4",
                Number(segment),
                `./downloads/video/finalVideoBlob_${segment}.mp4`
              );

              //Add the filePath to the DB
              const filePath = `${meetingId}/${userId}/video/${segment}/Final_video_${segment}`;
              try {
                await axios.post(
                  `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/dbRecord/addFinalFileKeys`,
                  {
                    meetingId: meetingId,
                    userId: userId,
                    fileType: "video",
                    segmentNum: Number(segment),
                    fileKey: filePath,
                  }
                );
              } catch (e) {
                console.log("Error in adding the filepath to db", e);
              }
              console.log("DONE UPLOADING THE SEGMENT VIDEO TO CLOUD");
            } catch (e) {
              console.log("Error occured in converting to mp4", e);
            }
          } catch (e) {
            console.log("Error occured in writing the final Video file");
          }
        })
      );

      await Promise.all(
        screenSegments.map(async (segment) => {
          const screenBlob: Blob[] = [];
          const files = fs.readdirSync(`./downloads/screen/${segment}`);
          await Promise.all(
            files.map(async (fileName) => {
              const file = await fs.openAsBlob(
                `./downloads/screen/${segment}/${fileName}`
              );
              screenBlob.push(file);
            })
          );
          //create a new blob and save it in the same folder as finalAudioFile
          const finalScreenBlob = new Blob(screenBlob);
          console.log("screen blob array is", screenBlob);

          try {
            const arrayBuffer = await finalScreenBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(
              `./downloads/screen/finalScreenBlob_${Number(segment)}.webm`,
              buffer
            );
            //covert the video to mp4.

            //Convert the .webm file to mp3 file.
            try {
              const convertProcess = await new ffmpeg(
                `./downloads/screen/finalVideoBlob_${segment}.webm`
              );
              // Convert .webm to .mp4 with compatible codecs
              convertProcess.setVideoFormat("mp4");
              await convertProcess.save(
                `./downloads/screen/finalVideoBlob_${segment}.mp4`
              );
              await uploadBlobsToS3(
                meetingId,
                userId,
                "screen",
                "video/mp4",
                Number(segment),
                `./downloads/screen/finalVideoBlob_${segment}.mp4`
              );
              //Add the filePath to the DB
              const filePath = `${meetingId}/${userId}/screen/${segment}/Final_screen_${segment}`;
              try {
                await axios.post(
                  `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/dbRecord/addFinalFileKeys`,
                  {
                    meetingId: meetingId,
                    userId: userId,
                    fileType: "screen",
                    segmentNum: Number(segment),
                    fileKey: filePath,
                  }
                );
              } catch (e) {
                console.log("Error in adding the filepath to db", e);
              }

              console.log("DONE UPLOADING THE FINAL SEGMENT SCREEN TO CLOUD");
            } catch (e) {
              console.log("Error occured in converting to mp4", e);
            }
          } catch (e) {
            console.log("Error occured in writing the final Screen file", e);
          }
        })
      );

      //4. Convert the all the multiple chunks of audio video and screenchunks to .mp3 / .mp4 files using ffmpeg.
      //5. get the presignedURL to upload the final files to the s3 under the folder name meetingId/userId/final/audio/
      //6. insert the filepath in the database.
      //7. delete the files from the servers filesystem.
      fs.rmSync("downloads", { recursive: true });
    } catch (e) {
      console.log("axios error", e);
    }
  },
  { connection }
);

function getFileName(url: string) {
  const parsed = new URL(url);

  const disposition = parsed.searchParams.get("response-content-disposition");
  if (disposition) {
    const match = disposition.match(/filename=([^;]+)/);
    if (match) {
      return decodeURIComponent(`${match[1]}`);
    }
  }

  return decodeURIComponent(`${parsed.pathname.split("/").pop()}`);
}

async function uploadBlobsToS3(
  meetingId: string,
  userId: string,
  typeOfFile: "audio" | "video" | "screen",
  contentType: "audio/webm" | "video/webm" | "audio/mp3" | "video/mp4",
  segmentNumber: number,
  filePath: string
) {
  const finalSegmentFileBuffer = fs.readFileSync(filePath);
  const fileBuffer = Buffer.from(finalSegmentFileBuffer);
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/startMultipartUpload`,
    {
      fileName: `Final_${typeOfFile}_${segmentNumber}`,
      fileType: typeOfFile,
      contentType: contentType,
      meetingId: meetingId,
      userId: userId,
      segmentNumber: segmentNumber,
    }
  );

  // get uploadId
  let { uploadId } = response.data;
  console.log("UploadId for the multiparts upload is -", uploadId);

  // get total size of the finalFile
  let totalSize = fileBuffer.byteLength;
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
      fileName: `Final_${typeOfFile}_${segmentNumber}`,
      uploadId: uploadId,
      partNumbers: numChunks,
      meetingId: meetingId,
      userId: userId,
      fileType: typeOfFile,
      segmentNumber: segmentNumber,
    }
  );

  let presigned_urls = presignedUrls_response?.data?.presignedUrls;

  // upload the finalFile into chunks to different presigned url
  let parts: any = [];
  const uploadPromises = [];
  for (let i = 0; i < numChunks; i++) {
    let start = i * chunkSize;
    let end = Math.min(start + chunkSize, totalSize);
    let chunk = fileBuffer.subarray(start, end);
    let presignedUrl = presigned_urls[i];
    try {
      uploadPromises.push(
        axios.put(presignedUrl, chunk, {
          headers: {
            "Content-Type": contentType,
          },
        })
      );
    } catch (e) {
      console.log("Error occured while pushing", e);
    }
  }

  const uploadResponses = await Promise.all(uploadPromises);
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

  // make a call to multipart complete api
  let complete_upload = await axios.post(
    `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/completeMultipartUpload`,
    {
      fileName: `Final_${typeOfFile}_${segmentNumber}`,
      uploadId: uploadId,
      parts: parts,
      meetingId: meetingId,
      userId: userId,
      fileType: typeOfFile,
      segmentNumber: segmentNumber,
    }
  );

  console.log("Complete upload- ", complete_upload.data);
}
