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

  // EXTREMELY STRICT still frame with minimal, loop-safe background animation
  const createVideoPrompt = (musicPrompt, slot) => {
    const isMorning = slot === "morning";
    const isNight = slot === "night";
    const m = musicPrompt.toLowerCase();

    // Collect MULTIPLE subtle background animations (additive, not else-if)
    const anim = [];
    if (/\brain|storm|wet\b/.test(m)) {
      anim.push("microscopic rain particles in the far background");
    }
    if (/\bsnow|winter\b/.test(m)) {
      anim.push("near-invisible snow dust drifting in deep background");
    }
    if (/\btraffic|city|urban\b/.test(m)) {
      anim.push(
        "tiny distant bokeh car lights gliding slowly along a horizon line"
      );
    }
    if (/\blamp|streetlight|neon\b/.test(m)) {
      anim.push("subtle street-lamp glow breathing periodically (no flicker)");
    }
    if (/\bleaves|autumn|fall\b/.test(m)) {
      anim.push("a few far leaves gently swaying on distant trees");
    }
    if (/\bbird|birds|seagull|sparrow\b/.test(m)) {
      anim.push(
        "tiny birds crossing at extreme distance on a slow periodic path"
      );
    }
    if (/\bplane|airplane|jet\b/.test(m)) {
      anim.push(
        "a faint aircraft light drifting along a long-period arc in the far distance"
      );
    }

    // Slot-based default if nothing matched
    if (anim.length === 0) {
      if (isMorning) anim.push("soft light motes floating in the far distance");
      else if (isNight)
        anim.push("barely visible atmospheric dust and very dim city bokeh");
      else anim.push("very faint ambient particles in the background");
    }

    const animationText = anim.join(", ");

    // Keep wording crisp: HARD (must) vs SOFT (style)
    return [
      `HARD CONSTRAINTS:
- The video MUST loop perfectly: the first and last frame are IDENTICAL for a seamless loop.
- Absolutely NO camera motion: no pan, tilt, zoom, dolly, handheld, or rack focus.
- Single continuous shot: no cuts, transitions, titles, logos, text, or black frames.
- No flicker: disable auto-exposure, auto-white-balance, auto-focus; keep color and grain stable.
- Motion is minimal, slow, periodic, and returns exactly to the start state at the loop point.
- Keep motion blur minimal and consistent across frames.`,

      `SOFT INTENT (style):
- The visual style MUST be anime - any anime aesthetic is acceptable (e.g., Studio Ghibli, Kyoto Animation, Akira-style, Makoto Shinkai, etc.) but it must be clearly anime-style animation.
- Match the mood of this music: "${musicPrompt}".
- Background carries motion: ${animationText}, gentle light shifts, floating dust.
- Foreground is almost static; if any idle movement exists (tiny breathing/sway), it must be loop-safe and extremely subtle.`,

      `LOOP METHOD (choose one and apply cleanly):
- Exact-Period: all animated parameters are periodic and return to their initial values at the final frame.
- Mirror/Ping-Pong: animate forward then reverse; ensure zero velocity at the midpoint to avoid a kink.`,

      `SCENE & RENDER GUIDANCE:
- Render in anime animation style - character designs, backgrounds, and overall aesthetic must be distinctly anime/animation style.
- Simple, stable composition; minimal parallax and no new occlusions at loop boundaries.
- Keep particle counts and speeds low; avoid specular pops or sudden highlight spikes near the loop seam.
- Prioritize distant/background motion so the loop reads as a calm "living still."`,
    ].join("\n\n");
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
