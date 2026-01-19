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
import ffmpeg from "fluent-ffmpeg";

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
    if (fs.existsSync(`./down`)) {
      console.log("removing the down folder");
      fs.rmSync(`./down`, { recursive: true });
    }
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
        },
      );
      const allChunkAccessURLs: getAllFileAccessURLResponse =
        allChunkAccessURLsReq.data;
      console.log("THE CHUNK URLS RECEIVED ARE,", allChunkAccessURLs);
      //2.map each media types segments and then chunks and then finally download each chunk in the fs in the same directory as mentioned
      //2.1 for each media type get the number of segments.
      //Iterate over each segment of that type and then fetch and save.
      const audioSegments = Object.keys(
        allChunkAccessURLs.audioChunkSegments.audioChunkKeys,
      );
      const videoSegments = Object.keys(
        allChunkAccessURLs.videoChunkSegments.videoChunkKeys,
      );
      const screenSegments = Object.keys(
        allChunkAccessURLs.screenChunkSegments.screenChunkKeys,
      );
      // console.log("The audioSegments keys are", audioSegments);
      // console.log("The videoSegment keys are", videoSegments);
      // console.log("The screenSegment keys are", screenSegments);
      // console.log(
      //   "THe screen links are",
      //   allChunkAccessURLs.videoChunkSegments.videoChunkKeys
      // );

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
              console.log(
                `Screen fetch status: ${res.status}, Content-Length: ${res.headers.get("content-length")}`,
              );
              if (!res.ok) {
                console.log(`Fetch failed for ${link}`);
                return;
              }
              if (!res.body) {
                console.log("NOTHING TO DOWNLOAD");
                return;
              }
              if (!fs.existsSync(`down/screen/${segment}`)) {
                await mkdir(`down/screen/${segment}`, { recursive: true });
              }
              const filename = getFileName(link);
              const destination = path.resolve(
                `./down/screen/${segment}`,
                filename,
              );
              try {
                //Write the file to the filePath as in the link
                const fileStream = fs.createWriteStream(destination, {
                  flags: "wx",
                });
                await finished(
                  Readable.fromWeb(res.body as any).pipe(fileStream),
                );
                const downloadedSize = fs.statSync(destination).size;
                console.log(
                  `Downloaded ${filename}: ${downloadedSize} bytes (expected: ${res.headers.get("content-length")})`,
                );
              } catch (e) {
                console.log(
                  "Error occured while saving the chunks of screen file.",
                  e,
                );
              }
            }),
          );
        }),
      );

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
              console.log(
                `audio fetch status: ${res.status}, Content-Length: ${res.headers.get("content-length")}`,
              );
              if (!res.ok) {
                console.log(`Fetch failed for ${link}`);
                return;
              }
              if (!res.body) {
                console.log("NOTHING TO DOWNLOAD");
                return;
              }
              if (!fs.existsSync(`down/audio/${segment}`)) {
                await mkdir(`down/audio/${segment}`, { recursive: true });
              }
              const filename = getFileName(link);
              const destination = path.resolve(
                `./down/audio/${segment}`,
                filename,
              );
              //Write the file to the filePath as in the link
              const fileStream = fs.createWriteStream(destination, {
                flags: "wx",
              });
              await finished(
                Readable.fromWeb(res.body as any).pipe(fileStream),
              );
            }),
          );
        }),
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
              console.log(
                `video fetch status: ${res.status}, Content-Length: ${res.headers.get("content-length")}`,
              );
              if (!res.ok) {
                console.log(`Fetch failed for ${link}`);
                return;
              }
              if (!res.body) {
                console.log("NOTHING TO DOWNLOAD");
                return;
              }
              if (!fs.existsSync(`down/video/${segment}`)) {
                await mkdir(`down/video/${segment}`, { recursive: true });
              }
              const filename = getFileName(link);
              const destination = path.resolve(
                `./down/video/${segment}`,
                filename,
              );
              try {
                //Write the file to the filePath as in the link
                const fileStream = fs.createWriteStream(destination, {
                  flags: "wx",
                });
                await finished(
                  Readable.fromWeb(res.body as any).pipe(fileStream),
                );
              } catch (e) {
                console.log("Error occured while writing video file", e);
              }
            }),
          );
        }),
      );

      //3. Make blobs of each segment number for audio, video and screen chunks, by accessing them from the filesystem.
      //DO IT FOR AUDIO
      console.log("MAKING THE AUDIO BLOB AND UPLOADING TO S3");
      for (const segment of audioSegments) {
        const audioBlob: Blob[] = [];
        const files = fs.readdirSync(`./down/audio/${segment}`);
        for (const fileName of files) {
          const file = await fs.openAsBlob(
            `./down/audio/${segment}/${fileName}`,
          );
          audioBlob.push(file);
        }
        //create a new blob and save it in the same folder as finalAudioFile
        const finalAudioBlob = new Blob(audioBlob);
        // console.log("audio blob array is", audioBlob);
        try {
          const arrayBuffer = await finalAudioBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          fs.writeFileSync(
            `./down/audio/finalAudioBlob_${segment}.webm`,
            buffer,
          );

          try {
            await new Promise<void>((resolve, reject) => {
              ffmpeg(`./down/audio/finalAudioBlob_${segment}.webm`)
                .audioCodec("libmp3lame")
                .audioBitrate("128k")
                .output(`./down/audio/finalAudioBlob_${segment}.mp3`)
                .on("end", () => {
                  console.log("Audio conversion complete");
                  resolve();
                })
                .on("error", (err) => {
                  console.log("Audio conversion error:", err);
                  reject(err);
                })
                .run();
            });
            await uploadBlobsToS3(
              meetingId,
              userId,
              "audio",
              "audio/mp3",
              Number(segment),
              `./down/audio/finalAudioBlob_${segment}.mp3`,
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
                },
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
      }

      console.log("MAKING THE VIDEO BLOB AND UPLOADING TO S3");
      for (const segment of videoSegments) {
        const videoBlob: Blob[] = [];
        const files = fs.readdirSync(`./down/video/${segment}`);
        for (const fileName of files) {
          const file = await fs.openAsBlob(
            `./down/video/${segment}/${fileName}`,
          );
          videoBlob.push(file);
        }
        //create a new blob and save it in the same folder as finalAudioFile
        const finalVideoBlob = new Blob(videoBlob);
        // console.log("video blob array is", videoBlob);
        try {
          const arrayBuffer = await finalVideoBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          fs.writeFileSync(
            `./down/video/finalVideoBlob_${segment}.webm`,
            buffer,
          );
          //Convert the .webm file to mp4 file.
          console.log("Converting the video from webm to mp4");
          try {
            await new Promise<void>((resolve, reject) => {
              ffmpeg(`./down/video/finalVideoBlob_${segment}.webm`)
                .videoCodec("libx264")
                .audioCodec("aac")
                .outputOptions([
                  "-preset fast",
                  "-crf 23",
                  "-movflags +faststart",
                ])
                .output(`./down/video/finalVideoBlob_${segment}.mp4`)
                .on("end", () => resolve())
                .on("error", (err) => reject(err))
                .run();
            });
            console.log("extracting the thumbnail");
            //Generate the thumbnail
            const mp4Path = `./down/video/finalVideoBlob_${segment}.mp4`;

            try {
              await new Promise<void>((resolve, reject) => {
                ffmpeg(mp4Path)
                  .screenshots({
                    count: 1,
                    folder: "./down/video",
                    filename: `Thumbnail_${segment}.jpg`,
                    size: "320x240",
                    timemarks: ["00:00:01"],
                  })
                  .on("end", () => {
                    console.log("Thumbnail extracted");
                    resolve();
                  })
                  .on("error", (err) => {
                    console.log("Thumbnail extraction error:", err.message);
                    reject(err);
                  });
              });
            } catch (e) {
              console.log("error in getting the thumbnail", e);
            }
            // console.log("Saving the thumbnail video");
            // fnExtractFrameToJPG outputs files as {file_name}_{frame_number}.jpg
            await saveThumbnailToS3(
              `Thumbnail_${segment}`,
              "video",
              meetingId,
              userId,
              Number(segment),
              `./down/video/Thumbnail_${segment}.jpg`,
            );
            await uploadBlobsToS3(
              meetingId,
              userId,
              "video",
              "video/mp4",
              Number(segment),
              `./down/video/finalVideoBlob_${segment}.mp4`,
            );

            //Add the filePath to the DB
            const filePath = `${meetingId}/${userId}/video/${segment}/Final_video_${segment}`;
            const screenThumbnailFilePath = `${meetingId}/${userId}/video/${segment}/Thumbnail_${segment}`;
            try {
              await axios.post(
                `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/dbRecord/addFinalFileKeys`,
                {
                  meetingId: meetingId,
                  userId: userId,
                  fileType: "video",
                  segmentNum: Number(segment),
                  fileKey: filePath,
                  thumbnailFileKey: screenThumbnailFilePath,
                },
              );
            } catch (e) {
              console.log("Error in adding the filepath to db", e);
            }
            console.log("DONE UPLOADING THE VIDEO SEGMENT TO CLOUD");
          } catch (e) {
            console.log("Error occured in converting to mp4", e);
          }
        } catch (e) {
          console.log("Error occured in writing the final Video file");
        }
      }
      console.log("MAKING THE Screen BLOB AND UPLOADING TO S3");
      for (const segment of screenSegments) {
        const screenBlob: Blob[] = [];
        const files = fs.readdirSync(`./down/screen/${segment}`);
        for (const fileName of files) {
          const file = await fs.openAsBlob(
            `./down/screen/${segment}/${fileName}`,
          );
          screenBlob.push(file);
        }
        //create a new blob and save it in the same folder as finalAudioFile
        const finalScreenBlob = new Blob(screenBlob);
        // console.log("screen blob array is", screenBlob);

        try {
          const arrayBuffer = await finalScreenBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          fs.writeFileSync(
            `./down/screen/finalScreenBlob_${segment}.webm`,
            buffer,
          );
          //covert the video to mp4.
          console.log("Converting the screen blob from webm to mp4");
          try {
            const webmPath = `./down/screen/finalScreenBlob_${segment}.webm`;
            const mp4Path = `./down/screen/finalScreenBlob_${segment}.mp4`;
            await new Promise<void>((resolve, reject) => {
              const command = ffmpeg(webmPath)
                .videoCodec("libx264")
                .audioCodec("aac")
                .audioChannels(2)
                .audioFrequency(48000)
                .audioBitrate("192k") // Increased for better quality
                .outputOptions([
                  "-strict -2", // Allow experimental AAC encoder
                ])
                .outputOptions([
                  // Quality settings - balanced for both static UI and video content
                  "-crf 18", // Good quality balance (18=high quality, 23=standard)
                  "-preset medium", // Better quality/compression balance

                  // Pixel format and compatibility
                  "-pix_fmt yuv420p", // Ensure broad compatibility

                  // Handle variable framerate from MediaRecorder
                  "-vsync 2", // Passthrough timestamps (VFR to CFR)
                  "-r 30", // Target 30fps output

                  // NO tune parameter - let x264 use default (balanced for all content)
                  // This works well for mixed static/dynamic screen content

                  // Scaling to ensure even dimensions
                  "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2",

                  // Prevent audio/video sync issues
                  "-max_muxing_queue_size 9999",
                  "-async 1", // Audio sync

                  // Fast streaming
                  "-movflags +faststart",

                  // Encoding parameters for mixed content
                  "-bf 2", // B-frames for compression
                  "-g 60", // Keyframe every 2 seconds at 30fps
                  "-profile:v high", // H.264 High Profile for better compression
                  "-level 4.1", // Wide device compatibility
                ])
                .output(mp4Path)
                .on("start", (cmd) => {
                  console.log("Starting conversion:", cmd);
                })
                .on("progress", (progress) => {
                  if (progress.percent) {
                    console.log(`Progress: ${Math.round(progress.percent)}%`);
                  }
                })
                .on("end", () => {
                  console.log("MP4 conversion complete");
                  resolve();
                })
                .on("error", (err, stdout, stderr) => {
                  console.log("Conversion error:", err.message);
                  console.log("FFmpeg stderr:", stderr);
                  reject(err);
                });

              command.run();
            });

            //Generate the thumbnail
            console.log("Extracting the thumbnail");
            // const thumbnailProcess = await new ffmpeg(
            //   `./down/screen/finalScreenBlob_${segment}.webm`,
            // );
            try {
              await new Promise<void>((resolve, reject) => {
                ffmpeg(mp4Path)
                  .screenshots({
                    count: 1,
                    folder: "./down/screen",
                    filename: `Thumbnail_${segment}.jpg`,
                    size: "320x240",
                    timemarks: ["00:00:02"],
                  })
                  .on("end", () => {
                    console.log("Thumbnail extracted");
                    resolve();
                  })
                  .on("error", (err) => {
                    console.log("Thumbnail extraction error:", err.message);
                    reject(err);
                  });
              });
            } catch (e) {
              console.log("error in getting the thumbnail", e);
            }
            // fnExtractFrameToJPG outputs files as {file_name}_{frame_number}.jpg
            console.log("Saving the thumbnail to s3");

            await saveThumbnailToS3(
              `Thumbnail_${segment}`,
              "screen",
              meetingId,
              userId,
              Number(segment),
              `./down/screen/Thumbnail_${segment}.jpg`,
            );
            console.log("Uploading the final Video to s3");
            await uploadBlobsToS3(
              meetingId,
              userId,
              "screen",
              "video/mp4",
              Number(segment),
              `./down/screen/finalScreenBlob_${segment}.mp4`,
            );
            //Add the filePath to the DB
            const screenfilePath = `${meetingId}/${userId}/screen/${segment}/Final_screen_${segment}`;
            const screenThumbnailFilePath = `${meetingId}/${userId}/screen/${segment}/Thumbnail_${segment}`;
            try {
              await axios.post(
                `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/dbRecord/addFinalFileKeys`,
                {
                  meetingId: meetingId,
                  userId: userId,
                  fileType: "screen",
                  segmentNum: Number(segment),
                  fileKey: screenfilePath,
                  thumbnailFileKey: screenThumbnailFilePath,
                },
              );
            } catch (e) {
              console.log("Error in adding the filepath to db", e);
            }

            console.log("DONE UPLOADING THE FINAL SCREEN SEGMENT TO CLOUD");
          } catch (e) {
            console.log("Error occured in converting to mp4", e);
          }
        } catch (e) {
          console.log("Error occured in writing the final Screen file", e);
        }
      }
      // fs.rmSync("./down", { recursive: true });
    } catch (e) {
      console.log("axios error", e);
    }
  },
  { connection },
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
  contentType: "audio/mp3" | "video/mp4",
  segmentNumber: number,
  filePath: string,
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
    },
  );

  // get uploadId
  let { uploadId } = response.data;
  // console.log("UploadId for the multiparts upload is -", uploadId);

  // get total size of the finalFile
  let totalSize = fileBuffer.byteLength;
  // set chunk size to 10MB
  let chunkSize = 10000000;
  // calculate number of chunks
  let numChunks = Math.ceil(totalSize / chunkSize);

  // console.log("Total file size:", totalSize);
  // console.log("Chunk size:", chunkSize);
  // console.log("Number of chunks:", numChunks);

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
    },
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
        }),
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
    },
  );

  // console.log("Complete upload- ", complete_upload.data);
}

async function saveThumbnailToS3(
  fileName: string,
  fileCategory: string,
  meetingId: string,
  userId: string,
  segmentNumber: number,
  thumbnailPath: string,
) {
  // check finalFile size if it is less than 10MB
  // Call your API to get the presigned URL
  try {
    const file = fs.readFileSync(thumbnailPath);

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/getSinglePresignedURL`,
      {
        fileName: fileName,
        fileCategory: fileCategory,
        fileType: "image/jpeg",
        meetingId: meetingId,
        userId: userId,
        segmentNumber: segmentNumber,
      },
    );
    const { url } = response.data;
    // console.log("The presigned url is", url);
    // Use the presigned URL to upload the finalFile
    try {
      const uploadResponse = await axios.put(url, file, {
        headers: {
          "Content-Type": "image/jpeg",
          "x-amz-acl": "public-read",
        },
      });

      if (uploadResponse.status === 200) {
        console.log("Uploaded the thumbnail");
      }
      //Add the fileKey of the audio file and the video file to the database table Recording.
    } catch (uploadError) {
      if (axios.isAxiosError(uploadError)) {
        throw new Error(`Response data:, ${uploadError.response?.data}`);
      }
      throw new Error(`Upload request failed: ${uploadError}`);
    }
  } catch (e) {
    console.log("error occured in reading file", e);
  }
}
