// lo-fi radio automation entrypoint for Railway cron or local CLI

import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { generateCoverImage } from "./src/generateCoverImage.js";
import { generateTrackWithMureka } from "./src/generateTrackWithMureka.js";
import { buildImagePromptFromMusicPrompt } from "./src/helpers/buildImagePromptFromMusicPrompt.js";
import { uploadToPlatforms } from "./src/uploadToPlatforms.js";
import { generateSlotPrompts } from "./src/generatePromptsWithChatGPT.js";
import { generateMetadataFromPrompt } from "./src/helpers/generateMetadataFromPrompt.js";
import fs from "fs";

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

    // ✅ Step 4: Build image prompt and generate cover
    const imagePrompt = buildImagePromptFromMusicPrompt(musicPromptObj, slot);
    const imageBuffer = await generateCoverImage({
      theme: slot,
      prompt: imagePrompt,
    });

    // ✅ Step 5: Upload everything
    await uploadToPlatforms(slot, audioBuffer, imageBuffer, metadata);

    console.log(`✅ All done for ${slot}!`);
  } catch (err) {
    console.error("❌ Error during generation:", err.message);
  }
})();
