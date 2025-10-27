import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

export async function generateVideoWithVeo(outputPath, slot, musicPrompt) {
  console.log("🎬 Starting Veo video generation (no image needed)...");

  // Generate a video prompt based on the music prompt
  // EXTREMELY STRICT still frame with minimal background animation
  const createVideoPrompt = (musicPrompt, slot) => {
    const isMorning = slot === "morning";
    const isNight = slot === "night";

    let animationElements = [];
    const musicLower = musicPrompt.toLowerCase();

    if (
      musicLower.includes("rain") ||
      musicLower.includes("storm") ||
      musicLower.includes("wet")
    ) {
      animationElements.push(
        "microscopic rain particles barely perceptible in far distance"
      );
    } else if (musicLower.includes("snow") || musicLower.includes("winter")) {
      animationElements.push("almost invisible snowflakes in far background");
    } else if (
      musicLower.includes("traffic") ||
      musicLower.includes("city") ||
      musicLower.includes("urban")
    ) {
      animationElements.push("tiny distant light points moving in background");
    } else if (musicLower.includes("leaves") || musicLower.includes("autumn")) {
      animationElements.push("minimal leaves barely moving in far background");
    } else {
      if (isMorning) {
        animationElements.push(
          "incredibly subtle light particles in far distance"
        );
      } else if (isNight) {
        animationElements.push(
          "barely visible atmospheric particles in deep background"
        );
      } else {
        animationElements.push("very faint light particles in background");
      }
    }

    const animationText = animationElements.join(", ");

    return `City pop anime scene matching this music: "${musicPrompt}". CRITICAL: This must be a PERFECTLY STILL FRAME. ZERO camera movement - absolutely no zoom, no pan, no drift, no rotation, no tracking, no movement whatsoever. The camera is completely FROZEN in place. All objects, characters, buildings, elements in the frame must remain STATIC and COMPLETELY MOTIONLESS. NO movement of sun, moon, clouds, vehicles, or ANY foreground or mid-ground elements. The ONLY animation allowed is microscopic atmospheric effects in the extreme far background: ${animationText}. These effects must be so subtle they are barely perceptible - almost like static noise. The scene must loop PERFECTLY with no visible loop point. The first frame and last frame must be IDENTICAL to allow seamless looping. City pop anime aesthetic with 80s retro vibes. Static composition only.`;
  };

  const prompt = createVideoPrompt(musicPrompt, slot);
  console.log("🎬 Veo prompt:", prompt);

  const models = ["veo-3.1-generate-preview", "veo-2-generate-preview"];

  let lastError = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const attemptNum = i + 1;

    try {
      console.log(
        `🎬 Attempting with model: ${model} (attempt ${attemptNum}/${models.length})`
      );

      let operation = await ai.models.generateVideos({
        model: model,
        prompt: prompt,
      });
      console.log(`🎬 Model ${model} accepted, operation started`);

      console.log("🎬 Video generation operation started, polling status...");

      let pollCount = 0;
      while (!operation.done) {
        pollCount++;
        console.log(`🎬 Polling ${pollCount}... (operation in progress)`);
        await new Promise((resolve) => setTimeout(resolve, 10000));

        operation = await ai.operations.getVideosOperation({
          operation: operation,
        });
      }

      console.log("🎬 Video generation complete, downloading...");

      const videoFile = operation.response.generatedVideos[0].video;
      const fileUri = typeof videoFile === "string" ? videoFile : videoFile.uri;

      if (!fileUri) {
        throw new Error("No video file URI found in response");
      }

      console.log(`📥 Downloading video from: ${fileUri}`);
      const videoResponse = await axios.get(fileUri, {
        responseType: "arraybuffer",
        params: {
          key: process.env.GOOGLE_AI_API_KEY,
        },
      });

      await fs.writeFile(outputPath, Buffer.from(videoResponse.data));

      console.log(`✅ Veo video saved to ${outputPath}`);

      return outputPath;
    } catch (error) {
      console.warn(
        `⚠️ Attempt ${attemptNum} failed with model ${model}:`,
        error.message
      );
      lastError = error;

      if (attemptNum === models.length) {
        console.error(
          "❌ All model attempts failed. Last error:",
          lastError.message
        );
        throw lastError;
      }
      console.log(`🔄 Trying next model...`);
    }
  }
}
