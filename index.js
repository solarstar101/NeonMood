// lo-fi radio automation entrypoint for Railway cron or local CLI

import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { generateCoverImage } from "./src/generateCoverImage.js";
import { generateTrackWithMureka } from "./src/generateTrackWithMureka.js";
import { buildImagePromptFromMusicPrompt } from "./src/helpers/buildImagePromptFromMusicPrompt.js";
import { uploadToPlatforms } from "./src/uploadToPlatforms.js";
import { generateSlotPrompts } from "./src/generatePromptsWithChatGPT.js";
import { generateMetadataFromPrompt } from "./src/helpers/generateMetadataFromPrompt.js";
import { generateVideoWithSora } from "./src/generateVideoWithSora.js";
import { composeVideoWithAudio } from "./src/composeVideoWithAudio.js";
import fs from "fs/promises";
import { execSync } from "child_process";

const SLOTS = {
  morning: {
    theme: "morning",
    vibe: "calm and refreshing",
    bpm: 85,
    genre: "city pop",
    promptStyle:
      "sunrise, retro Tokyo skyline, warm lighting, anime-style aesthetic",
  },
  midday: {
    theme: "midday",
    vibe: "bright and energetic",
    bpm: 95,
    genre: "city pop",
    promptStyle:
      "bustling Shibuya street, 80s fashion, urban daylight, vaporwave tones",
  },
  night: {
    theme: "night",
    vibe: "dreamy and nostalgic",
    bpm: 80,
    genre: "city pop",
    promptStyle:
      "neon-lit Tokyo alley, reflections on wet pavement, retro anime mood",
  },
};

const slot = process.argv[2];
if (!slot || !SLOTS[slot]) {
  console.error("❌ You must pass a valid slot: morning, midday, or night");
  process.exit(1);
}

(async () => {
  try {
    console.log(`⏱ Starting ${slot} generation...`);

    // ✅ Step 1: Generate slot prompts once
    const prompts = await generateSlotPrompts(slot);
    const musicPromptObj = prompts.musicPrompt;
    const musicPromptStr = JSON.stringify(musicPromptObj, null, 2);

    console.log(`🎼 Music Prompt:\n${musicPromptStr}`);

    // ✅ Step 2: Generate YouTube metadata using the same music prompt
    const metadata = await generateMetadataFromPrompt(slot, musicPromptStr);
    console.log(
      `📝 Metadata:\nTitle: ${metadata.title}\nTags: ${metadata.tags.join(
        ", "
      )}`
    );

    // ✅ Step 3: Generate audio
    const audioBuffer = await generateTrackWithMureka(musicPromptStr);

    // Get audio duration for video looping
    console.log("⏱ Getting audio duration...");
    const tempAudioPath = `temp_audio_${slot}.mp3`;
    console.log("⏱ Writing audio buffer to:", tempAudioPath);
    await fs.writeFile(tempAudioPath, audioBuffer);
    console.log("⏱ Audio buffer written");
    // Give the file system a moment to flush
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log("⏱ Calling ffprobe...");
    let audioDuration;
    try {
      const ffprobeOutput = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempAudioPath}"`
      );
      console.log("⏱ ffprobe output:", ffprobeOutput.toString());
      audioDuration = parseFloat(ffprobeOutput.toString().trim());
      console.log(`⏱ Audio duration: ${audioDuration.toFixed(2)} seconds`);
    } catch (err) {
      console.error("❌ Error getting audio duration:", err.message);
      console.error("❌ Error stack:", err.stack);
      throw err;
    }

    // ✅ Step 4: Build image prompt and generate cover
    console.log("🎨 About to generate cover image...");
    const imagePrompt = buildImagePromptFromMusicPrompt(musicPromptObj, slot);
    const imageBuffer = await generateCoverImage({
      theme: slot,
      prompt: imagePrompt,
    });
    console.log("✅ Cover image generated");

    // ✅ Step 5: Generate scenic loop video with Sora
    let tempSoraVideoPath = null;
    let videoGenerationSuccess = false;
    let soraJobInfo = null;

    try {
      console.log("🎬 About to generate video with Sora...");
      const soraResult = await generateVideoWithSora({
        slot,
        musicPrompt: musicPromptStr,
      });

      tempSoraVideoPath = `temp_sora_video_${slot}.mp4`;
      await fs.writeFile(tempSoraVideoPath, soraResult.buffer);
      soraJobInfo = soraResult.job;
      console.log(
        `✅ Sora video ready (job=${soraJobInfo?.id ?? "unknown"}, duration=${
          soraResult.metadata.seconds
        }s)`
      );
      videoGenerationSuccess = true;
    } catch (soraError) {
      console.warn(
        "⚠️ Sora video generation failed, will use image-based video instead"
      );
      console.warn("Error:", soraError.message);
      tempSoraVideoPath = null;
    }

    // ✅ Step 6: Compose video (loop) with audio
    let finalVideoBuffer = null;

    if (videoGenerationSuccess && tempSoraVideoPath) {
      console.log("🎬 About to compose Sora video with audio...");
      finalVideoBuffer = await composeVideoWithAudio(
        tempSoraVideoPath,
        audioBuffer,
        audioDuration
      );
      console.log("✅ Video composed successfully");
    } else {
      console.log("📸 Will create video from image + audio during upload");
    }

    // ✅ Step 7: Clean up temp files
    await fs.unlink(tempAudioPath).catch(() => {});
    if (tempSoraVideoPath) {
      await fs.unlink(tempSoraVideoPath).catch(() => {});
    }

    // ✅ Step 8: Upload everything
    await uploadToPlatforms(
      slot,
      audioBuffer,
      imageBuffer,
      metadata,
      finalVideoBuffer
    );

    console.log(`✅ All done for ${slot}!`);
  } catch (err) {
    console.error("❌ Error during generation:", err.message);
  }
})();
