import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export async function composeVideoWithAudio(
  videoPath,
  audioBuffer,
  audioDuration
) {
  console.log("🎬 Composing video with audio...");
  console.log("📝 Original audio duration:", audioDuration, "seconds");
  console.log("🔄 Will loop video to match audio length");
  console.log("🎵 Preserving original audio quality");

  const audioPath = path.resolve("temp_audio_for_video.mp3");
  const outputPath = path.resolve("final_video_output.mp4");

  try {
    console.log("💾 Saving original audio to temp file...");
    await fs.writeFile(audioPath, audioBuffer);
    console.log(
      "🎵 Audio file saved. Expected duration:",
      audioDuration,
      "seconds"
    );

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-stream_loop",
        "-1", // Loop video input infinitely
        "-i",
        videoPath,
        "-i",
        audioPath,
        "-map",
        "0:v", // Map video from first input (looped video)
        "-map",
        "1:a", // Map audio from second input (original audio file)
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "18",
        "-c:a",
        "copy", // Copy audio stream without re-encoding
        "-pix_fmt",
        "yuv420p",
        "-shortest", // Stop encoding when shortest input ends (audio)
        "-vf",
        "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
        outputPath,
        "-y", // Overwrite output file
      ]);

      let stderr = "";
      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          console.log("✅ Video composed successfully");
          console.log(
            "📊 Final video should be",
            audioDuration,
            "seconds long (matching audio)"
          );
          fs.readFile(outputPath)
            .then((buffer) => {
              fs.unlink(audioPath).catch(() => {});
              fs.unlink(outputPath).catch(() => {});
              resolve(buffer);
            })
            .catch(reject);
        } else {
          console.error("ffmpeg stderr:", stderr);
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });
    });
  } catch (error) {
    await fs.unlink(audioPath).catch(() => {});
    throw error;
  }
}
