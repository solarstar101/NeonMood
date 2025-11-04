import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { google } from "googleapis";
import { spawn, execSync } from "child_process";
import {
  getOrCreatePlaylist,
  addVideoToPlaylist,
} from "../youtube/playlistHelpers.js";

function getAudioDuration(filePath) {
  const output = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  return parseFloat(output.toString().trim());
}

const VIDEO_OUTPUT_PATH = path.resolve("output.mp4");
const SHORT_VIDEO_PATH = path.resolve("short_output.mp4");

async function createShortVersion(audioPath, imagePath, shortPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-loop",
      "1",
      "-i",
      imagePath,
      "-i",
      audioPath,
      "-t",
      "45", // Clip to 45 seconds
      "-c:v",
      "libx264",
      "-tune",
      "stillimage",
      "-preset",
      "slow",
      "-crf",
      "18",
      "-c:a",
      "aac",
      "-b:a",
      "256k",
      "-pix_fmt",
      "yuv420p",
      "-shortest",
      "-vf",
      "scale=1080:1920",
      shortPath,
      "-y",
    ]);

    ffmpeg.stderr.on("data", (data) => console.error(data.toString()));
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve(true);
      else reject(new Error("Short creation failed."));
    });
  });
}

async function createShortFromVideo(videoPath, shortPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      videoPath,
      "-t",
      "45", // Clip to 45 seconds
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "18",
      "-c:a",
      "aac",
      "-b:a",
      "256k",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
      shortPath,
      "-y",
    ]);

    ffmpeg.stderr.on("data", (data) => console.error(data.toString()));
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve(true);
      else reject(new Error("Short creation from video failed."));
    });
  });
}

export async function uploadToYouTube(
  slot,
  audioBuffer,
  imageBuffer,
  metadata,
  videoBuffer = null
) {
  const audioPath = path.resolve(`${slot}.mp3`);
  const imagePath = path.resolve(`${slot}.png`);

  // 1. Save audio/image buffers to disk
  await fs.writeFile(audioPath, audioBuffer);
  await fs.writeFile(imagePath, imageBuffer);

  const durationInSeconds = getAudioDuration(audioPath);
  const isShort = durationInSeconds <= 90;

  const title = isShort ? `${metadata.title} #Shorts` : metadata.title;
  const description = isShort
    ? `${metadata.description}\n\n#Shorts`
    : metadata.description;

  // 2. Use video if provided, otherwise create from image+audio
  if (videoBuffer) {
    console.log("🎬 Using generated Veo video");
    console.log("💾 Writing video buffer to disk...");
    await fs.writeFile(VIDEO_OUTPUT_PATH, videoBuffer);
    console.log("✅ Video file saved, preparing for upload...");
  } else {
    // Fallback to original behavior (image + audio)
    console.log("📸 Creating video from image + audio");
    const scale = isShort ? "1080:1920" : "1920:1080";
    const crf = "18";

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-loop",
        "1",
        "-i",
        imagePath,
        "-i",
        audioPath,
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-preset",
        "slow",
        "-crf",
        crf,
        "-c:a",
        "aac",
        "-b:a",
        "256k",
        "-pix_fmt",
        "yuv420p",
        "-shortest",
        "-vf",
        `scale=${scale}`,
        VIDEO_OUTPUT_PATH,
        "-y",
      ]);

      ffmpeg.stderr.on("data", (data) => console.error(data.toString()));
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });
  }

  // 3. Setup YouTube OAuth2 client
  console.log("🔐 Setting up YouTube OAuth2 authentication...");
  const oauth2Client = new google.auth.OAuth2(
    process.env.YT_CLIENT_ID,
    process.env.YT_CLIENT_SECRET,
    process.env.YT_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.YT_REFRESH_TOKEN,
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  console.log("✅ Authentication complete, preparing video upload...");

  // 4. Upload full video
  console.log("📤 Starting YouTube video upload (this may take a while)...");
  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description,
        tags: metadata.tags,
        categoryId: "10",
        defaultLanguage: "en",
      },
      status: {
        privacyStatus: "public",
        embeddable: true,
        license: "youtube",
        madeForKids: false,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: createReadStream(VIDEO_OUTPUT_PATH),
    },
  });

  const videoId = res.data.id;
  console.log(
    `✅ Uploaded full video: https://www.youtube.com/watch?v=${videoId}`
  );

  // 5. Add full video to playlist
  const playlistId = await getOrCreatePlaylist(slot, oauth2Client);
  await addVideoToPlaylist(videoId, playlistId, oauth2Client);

  // 6. If long, create and upload a 45-second Short
  if (!isShort) {
    // Create short version - use video if available, otherwise use image+audio
    if (videoBuffer) {
      await createShortFromVideo(VIDEO_OUTPUT_PATH, SHORT_VIDEO_PATH);
    } else {
      await createShortVersion(audioPath, imagePath, SHORT_VIDEO_PATH);
    }

    const shortRes = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: `${metadata.title} #Shorts`,
          description: `Listen to the full version: https://www.youtube.com/watch?v=${videoId}\n\n${metadata.description}\n\n#Shorts`,
          tags: metadata.tags,
          categoryId: "10",
          relatedVideoId: videoId,
          defaultLanguage: "en",
        },
        status: {
          privacyStatus: "public",
          embeddable: true,
          license: "youtube",
          madeForKids: false,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: createReadStream(SHORT_VIDEO_PATH),
      },
    });

    const shortId = shortRes.data.id;
    console.log(
      `🎬 Uploaded short: https://www.youtube.com/watch?v=${shortId}`
    );
  }
}
