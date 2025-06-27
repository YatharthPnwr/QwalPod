export async function getUserMedia() {
  try {
    const DisplayMedia = await navigator.mediaDevices.getDisplayMedia();
    return DisplayMedia;
  } catch (e) {
    console.log(e);
  }
}

export async function getUserDevices(): Promise<MediaStream | null> {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    return mediaStream;
  } catch (e) {
    console.log(e);
    return null;
  }
}
