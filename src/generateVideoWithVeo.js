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

  function extractMoodSummary(musicPrompt) {
    if (!musicPrompt) return "";

    try {
      const parsed = JSON.parse(musicPrompt);
      const parts = [];
      if (parsed.Title) parts.push(`Title: ${parsed.Title}`);
      if (parsed.Mood) parts.push(`Mood: ${parsed.Mood}`);
      if (parsed.Instruments) parts.push(`Instruments: ${parsed.Instruments}`);
      if (parsed.Structure) parts.push(`Structure: ${parsed.Structure}`);
      return parts.join(" | ").slice(0, 400);
    } catch (_) {
      return musicPrompt.replace(/\s+/g, " ").slice(0, 300);
    }
  }

  function adjustTimeOfDayForSlot(text, slot) {
    // Ensure time-of-day references match the slot
    const isMorning = slot === "morning";
    const isMidday = slot === "midday";
    const isNight = slot === "night";

    if (isMorning) {
      return text
        .replace(/at night/gi, "at morning")
        .replace(/at midday/gi, "at morning")
        .replace(/at late afternoon/gi, "at early morning")
        .replace(/at twilight/gi, "at dawn")
        .replace(/at sunset/gi, "at sunrise")
        .replace(/at dusk/gi, "at dawn")
        .replace(/at golden hour/gi, "at golden hour sunrise")
        .replace(/night /gi, "morning ")
        .replace(/evening /gi, "morning ");
    } else if (isMidday) {
      return text
        .replace(/at night/gi, "at midday")
        .replace(/at morning/gi, "at midday")
        .replace(/at dawn/gi, "at midday")
        .replace(/at sunrise/gi, "at midday")
        .replace(/at twilight/gi, "at midday")
        .replace(/at sunset/gi, "at midday")
        .replace(/at dusk/gi, "at midday")
        .replace(/at late afternoon/gi, "at midday")
        .replace(/at golden hour/gi, "at bright midday")
        .replace(/night /gi, "midday ")
        .replace(/morning /gi, "midday ")
        .replace(/evening /gi, "midday ")
        .replace(/dawn /gi, "midday ");
    } else if (isNight) {
      return text
        .replace(/at morning/gi, "at night")
        .replace(/at midday/gi, "at night")
        .replace(/at dawn/gi, "at night")
        .replace(/at sunrise/gi, "at night")
        .replace(/at late afternoon/gi, "at night")
        .replace(/at golden hour/gi, "at night")
        .replace(/morning /gi, "night ")
        .replace(/midday /gi, "night ")
        .replace(/dawn /gi, "night ")
        .replace(/bright /gi, "dark ");
    }
    return text;
  }

  function extractSceneElements(musicPrompt, slot) {
    const isMorning = slot === "morning";
    const isNight = slot === "night";
    const m = musicPrompt.toLowerCase();

    let elements = {
      cinematography: {},
      subject: "",
      actions: [],
      context: "",
      style: {}
    };

    // Determine scene type and build elements
    if (/\btraffic|city|urban|neon|street\b/.test(m)) {
      if (isNight) {
        elements.cinematography = {
          shot: "wide establishing shot, eye level",
          composition: "fixed vantage point from rooftop",
          lens: "wide-angle lens",
          focus: "deep focus, maintaining clarity throughout"
        };
        elements.subject = "a lo-fi anime night city skyline";
        elements.actions = [
          "neon lights flickering in periodic cycles",
          "gentle rain falling in continuous loops",
          "distant clouds drifting in repeating patterns",
          "steam rising in cyclical waves"
        ];
        elements.context = "viewed from a fixed rooftop vantage, no people present";
        elements.style = {
          aesthetic: "1980s hand-drawn anime OVA",
          lighting: "neon and practical lights with cool rim lighting, atmospheric haze",
          palette: "vibrant neon reflections, deep blues, electric pinks, warm VHS grain",
          mood: "moody, atmospheric, nostalgic"
        };
      } else if (isMorning) {
        elements.cinematography = {
          shot: "wide shot, eye level",
          composition: "stable composition over city terrace",
          lens: "wide-angle lens",
          focus: "deep focus"
        };
        elements.subject = "an anime sunrise over a calm city terrace";
        elements.actions = [
          "morning fog rolling in periodic waves",
          "hanging lanterns flickering gently in cycles",
          "leaves swaying in repeating patterns from gentle breeze",
          "light particles drifting in loops"
        ];
        elements.context = "tranquil urban ambience, no people";
        elements.style = {
          aesthetic: "1980s anime OVA",
          lighting: "warm natural key with soft fill, golden hour quality",
          palette: "warm film grain, amber, peach, cream tones",
          mood: "tranquil, meditative, peaceful"
        };
      } else {
        elements.cinematography = {
          shot: "wide establishing shot, eye level",
          composition: "locked frame of cityscape",
          lens: "wide-angle lens",
          focus: "deep focus"
        };
        elements.subject = "an anime cityscape at midday";
        elements.actions = [
          "building window lights pulsing gently in cycles",
          "flags and fabric moving in repeating patterns from gentle breeze",
          "atmospheric particles drifting in loops",
          "subtle shadows from clouds shifting in periodic waves"
        ];
        elements.context = "clear daylight urban setting";
        elements.style = {
          aesthetic: "1980s anime OVA",
          lighting: "balanced natural lighting with atmospheric depth",
          palette: "clear daylight, vibrant urban details, warm grays",
          mood: "energetic, clear, vibrant"
        };
      }
    } else if (/\bbeach|ocean|sea|coast|shore\b/.test(m)) {
      elements.cinematography = {
        shot: "wide shot, eye level",
        composition: "stable composition of coastal boardwalk",
        lens: "wide-angle lens",
        focus: "deep focus"
      };
      elements.subject = adjustTimeOfDayForSlot(`an anime coastal boardwalk at ${slot === "morning" ? "golden hour sunrise" : slot === "midday" ? "bright midday" : "night"}`, slot);
      elements.actions = [
        "ocean waves rolling in continuous loops",
        "water surface reflections moving in periodic cycles",
        "lantern-lit kiosks and building lights flickering gently in cycles",
        "flags or fabric swaying in repeating patterns from wind",
        "light reflections on water dancing in loops"
      ];
      elements.context = adjustTimeOfDayForSlot(`coastal setting at ${slot === "morning" ? "golden hour sunrise" : slot === "midday" ? "bright midday" : "night"}`, slot);
      elements.style = {
        aesthetic: "1980s anime OVA",
        lighting: slot === "morning" ? "warm natural key with soft fill, golden hour sunrise quality" : slot === "midday" ? "bright natural lighting with balanced exposure" : "neon and practical lights with cool rim lighting",
        palette: slot === "morning" ? "sparkling highlights, warm VHS grain, soft reflections, amber, peach, cream" : slot === "midday" ? "clear daylight tones, vibrant colors, warm grays" : "moody lighting, deep blues, electric accents, warm VHS grain",
        mood: slot === "morning" ? "serene, warm, nostalgic" : slot === "midday" ? "energetic, clear, vibrant" : "moody, atmospheric, nostalgic"
      };
    } else if (/\bmountain|peak|alpine|summit|ridge\b/.test(m)) {
      elements.cinematography = {
        shot: "wide establishing shot, eye level",
        composition: "locked frame of mountain ridge",
        lens: "wide-angle lens",
        focus: "deep focus"
      };
      elements.subject = "an anime mountain ridge with a wooden teahouse and glowing lanterns";
      elements.actions = [
        "cherry blossoms and tall grass swaying in periodic waves",
        "lanterns and building lights flickering gently in cycles",
        "vapor clouds drifting in repeating patterns",
        "gentle wind moving foliage in loops"
      ];
      elements.context = "serene mountain setting";
      elements.style = {
        aesthetic: "1980s anime OVA",
        lighting: slot === "morning" ? "warm natural key with soft fill, golden hour sunrise quality" : slot === "midday" ? "bright natural lighting with balanced exposure" : "warm practical lights with cool rim lighting",
        palette: slot === "morning" ? "warm grain, dreamy colors, sage green, warm amber, cream" : slot === "midday" ? "clear daylight tones, vibrant greens, warm earth tones" : "warm grain, dreamy colors, sage green, deep blues, warm amber",
        mood: "serene, peaceful, meditative"
      };
    } else if (/\bforest|woods|grove|nature\b/.test(m)) {
      elements.cinematography = {
        shot: "wide shot, eye level",
        composition: "stable composition of forest clearing",
        lens: "wide-angle lens",
        focus: "deep focus"
      };
      elements.subject = adjustTimeOfDayForSlot(`an anime forest clearing at ${slot === "morning" ? "dawn" : slot === "midday" ? "midday" : "night"}`, slot);
      elements.actions = [
        "light particles drifting in periodic orbits",
        "mist swirling in repeating layers",
        "foliage swaying in cyclical patterns from gentle wind",
        "light filtering through leaves in loops"
      ];
      elements.context = adjustTimeOfDayForSlot(`forest setting at ${slot === "morning" ? "dawn" : slot === "midday" ? "midday" : "night"}, no human presence`, slot);
      elements.style = {
        aesthetic: "1980s anime OVA",
        lighting: slot === "morning" ? "warm natural key with soft fill, golden hour sunrise quality" : slot === "midday" ? "bright natural lighting filtering through leaves" : "cool rim lighting from night sky",
        palette: slot === "morning" ? "luminous highlights, deep emerald tones, moss green, warm amber, cream" : slot === "midday" ? "luminous highlights, deep emerald tones, moss green, forest brown, olive" : "luminous highlights, deep emerald tones, moss green, forest brown, deep blues",
        mood: slot === "morning" ? "tranquil, ethereal, peaceful" : slot === "midday" ? "energetic, clear, vibrant" : "mysterious, tranquil, ethereal"
      };
    } else if (/\brain|storm|wet\b/.test(m)) {
      elements.cinematography = {
        shot: "medium-wide shot, eye level",
        composition: "locked frame of rain-soaked alley",
        lens: "wide-angle lens",
        focus: "deep focus"
      };
      elements.subject = "an anime rain-soaked alley with neon signage";
      elements.actions = [
        "rain falling in continuous loops",
        "water reflections rippling on puddles in periodic patterns",
        "neon signs and building lights flickering gently in cycles",
        "steam vents pulsing in repeating motions",
        "hanging signs swaying in loops from wind"
      ];
      elements.context = "urban alley setting at night";
      elements.style = {
        aesthetic: "1980s anime OVA",
        lighting: "neon and practical lights with cool rim lighting",
        palette: "glossy highlights, moody lighting, cyan, magenta, deep blue, electric pink",
        mood: "moody, atmospheric, melancholic"
      };
    } else if (/\bpark|pond|cherry|lantern|garden|sakura\b/.test(m)) {
      elements.cinematography = {
        shot: "wide shot, eye level",
        composition: "stable composition of park pond",
        lens: "wide-angle lens",
        focus: "soft depth of field"
      };
      elements.subject = adjustTimeOfDayForSlot(`an anime park pond at ${slot === "morning" ? "early morning" : slot === "midday" ? "midday" : "night"}`, slot);
      elements.actions = [
        "cherry blossoms drifting in continuous loops",
        "water ripples and surface reflections moving in periodic patterns",
        "stone lanterns and building lights flickering softly in cycles",
        "branches swaying in repeating motions",
        "water surface creating gentle ripple patterns that loop"
      ];
      elements.context = adjustTimeOfDayForSlot(`park setting at ${slot === "morning" ? "early morning" : slot === "midday" ? "midday" : "night"}, no characters present`, slot);
      elements.style = {
        aesthetic: "1980s anime OVA",
        lighting: slot === "morning" ? "warm natural key with soft fill, golden hour sunrise quality" : slot === "midday" ? "bright natural lighting with balanced exposure" : "warm practical lights with cool rim lighting",
        palette: slot === "morning" ? "pastel palette, soft pink, lavender, pearl white, mint green, pale blue, warm amber" : slot === "midday" ? "pastel palette, soft pink, lavender, pearl white, mint green, pale blue" : "pastel palette, soft pink, lavender, pearl white, mint green, pale blue, deep blues",
        mood: "tranquil, peaceful, dreamy"
      };
    } else if (/\blake|mist|water|valley|reflection\b/.test(m)) {
      elements.cinematography = {
        shot: "wide establishing shot, eye level",
        composition: "fixed frame of lakeside panorama",
        lens: "wide-angle lens",
        focus: "deep focus"
      };
      elements.subject = adjustTimeOfDayForSlot(`an anime lakeside panorama at ${slot === "morning" ? "dawn" : slot === "midday" ? "midday" : "night"}`, slot);
      elements.actions = [
        "mist rolling in periodic waves",
        "floating lanterns and ambient lights flickering gently in cycles",
        "water ripples and surface reflections in repeating patterns",
        "leaves or reeds swaying in loops from gentle wind",
        "light reflections on water dancing continuously"
      ];
      elements.context = adjustTimeOfDayForSlot(`lakeside setting at ${slot === "morning" ? "dawn" : slot === "midday" ? "midday" : "night"}, quiet atmospheric motion only`, slot);
      elements.style = {
        aesthetic: "1980s anime OVA",
        lighting: slot === "morning" ? "warm natural key with soft fill, golden hour sunrise quality" : slot === "midday" ? "bright natural lighting with balanced exposure" : "warm practical lights with cool rim lighting",
        palette: slot === "morning" ? "gentle grain, pearlescent light, amber, peach, soft yellow, cream" : slot === "midday" ? "clear daylight tones, vibrant blues, warm grays, cream" : "gentle grain, pearlescent light, deep blues, soft purples, warm amber",
        mood: "serene, ethereal, peaceful"
      };
    } else {
      // Default based on slot
      if (isNight) {
        elements.cinematography = {
          shot: "wide establishing shot, eye level",
          composition: "fixed vantage point from rooftop",
          lens: "wide-angle lens",
          focus: "deep focus"
        };
        elements.subject = "a lo-fi anime night city skyline";
        elements.actions = [
          "building lights and neon signs flickering in periodic cycles",
          "gentle rain falling in continuous loops",
          "distant clouds drifting in repeating patterns",
          "steam rising from vents in cyclical waves"
        ];
        elements.context = "viewed from a fixed rooftop vantage, no people present";
        elements.style = {
          aesthetic: "1980s hand-drawn anime OVA",
          lighting: "neon and practical lights with cool rim lighting",
          palette: "vibrant neon reflections, deep blues, electric pinks, warm VHS grain",
          mood: "moody, atmospheric, nostalgic"
        };
      } else if (isMorning) {
        elements.cinematography = {
          shot: "wide shot, eye level",
          composition: "stable composition over city terrace",
          lens: "wide-angle lens",
          focus: "deep focus"
        };
        elements.subject = "an anime sunrise over a calm city terrace";
        elements.actions = [
          "morning fog rolling in periodic waves",
          "hanging lanterns flickering gently in cycles",
          "leaves swaying in repeating patterns from gentle breeze",
          "light particles drifting in loops"
        ];
        elements.context = "tranquil urban ambience, no people";
        elements.style = {
          aesthetic: "1980s anime OVA",
          lighting: "warm natural key with soft fill, golden hour quality",
          palette: "warm film grain, amber, peach, cream tones",
          mood: "tranquil, meditative, peaceful"
        };
      } else {
        elements.cinematography = {
          shot: "wide shot, eye level",
          composition: "stable composition of park pond",
          lens: "wide-angle lens",
          focus: "soft depth of field"
        };
        elements.subject = adjustTimeOfDayForSlot(`an anime park pond at ${slot === "morning" ? "early morning" : slot === "midday" ? "midday" : "night"}`, slot);
        elements.actions = [
          "cherry blossoms drifting in continuous loops",
          "water ripples and surface reflections moving in periodic patterns",
          "stone lanterns and ambient lights flickering softly in cycles",
          "branches swaying in repeating motions",
          "water surface creating gentle ripple patterns that loop"
        ];
        elements.context = adjustTimeOfDayForSlot(`park setting at ${slot === "morning" ? "early morning" : slot === "midday" ? "midday" : "night"}, no characters present`, slot);
        elements.style = {
          aesthetic: "1980s anime OVA",
          lighting: "warm natural key with soft fill",
          palette: "pastel palette, soft pink, lavender, pearl white, mint green, pale blue",
          mood: "tranquil, peaceful, dreamy"
        };
      }
    }

    return elements;
  }

  const createVideoPrompt = (musicPrompt, slot) => {
    const elements = extractSceneElements(musicPrompt, slot);
    const moodSummary = extractMoodSummary(musicPrompt);

    // Build prompt following Veo 3.1 guide's five-part formula:
    // [Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]
    
    const promptParts = [];

    // 1. CINEMATOGRAPHY (most powerful tool per guide)
    promptParts.push(
      `[Cinematography] ${elements.cinematography.shot}, ${elements.cinematography.composition}. ${elements.cinematography.lens}, ${elements.cinematography.focus}.`,
      `Camera movement: ZERO - ABSOLUTELY FORBIDDEN. The camera is completely frozen, locked, and static - like a tripod-mounted photograph. NO camera movement of ANY kind: no zoom, no pan, no tilt, no dolly, no tracking, no rotation, no focus drift, no stabilization drift, no parallax, no camera shake, no handheld movement. Camera position, angle, framing, and focus remain 100% static throughout the entire video. The camera frame is frozen in place from first frame to last frame.`
    );

    // 2. SUBJECT
    promptParts.push(
      `[Subject] ${elements.subject}.`
    );

    // 3. ACTION (specific beats that complete cycles - ONLY minimal loop-friendly animations)
    const actionDescriptions = elements.actions.map((action, index) => {
      return `- ${action.charAt(0).toUpperCase() + action.slice(1)}, completing exactly one full cycle and returning to starting state`;
    });
    promptParts.push(
      `[Action] ONLY environmental effects are present (NO moving objects):`,
      ...actionDescriptions,
      "",
      "ALLOWED - Environmental effects only (these can loop perfectly):",
      "- Weather effects: rain falling in periodic loops, snow drifting in continuous loops",
      "- Wind effects: leaves, grass, fabric, flags, branches swaying in repeating patterns",
      "- Lighting effects: neon signs, streetlights, window lights, building lights flickering or pulsing in periodic cycles",
      "- Water effects: ripples, waves, pond surfaces, water reflections moving in continuous loops (NO fountains with jets - only surface effects)",
      "- Atmospheric effects: fog/mist rolling in periodic waves, steam/smoke rising in cyclical waves",
      "- Particle effects: dust, light particles drifting in closed circular paths (NO fireflies - they move too randomly)",
      "- Gentle swaying: plants, decorations, or hanging elements moving in cyclical patterns",
      "",
      "FORBIDDEN - NO moving objects (these cannot loop perfectly):",
      "- NO trains, vehicles, cars, buses, or any moving transportation",
      "- NO animals, birds, or any living creatures",
      "- NO people or characters",
      "- NO boats, planes, or flying objects",
      "- NO complex moving machinery or mechanical objects",
      "- ONLY environmental effects that repeat in perfect cycles",
      "",
      "ALL animations must be periodic and cyclic - completing exactly one full cycle by the final frame and returning to starting states. Use sine waves, circular paths, or oscillating patterns that naturally loop."
    );

    // 4. CONTEXT
    promptParts.push(
      `[Context] ${elements.context}. Single continuous shot only: no cuts, transitions, titles, logos, text, or black frames.`
    );

    // 5. STYLE & AMBIANCE
    promptParts.push(
      `[Style & Ambiance] ${elements.style.aesthetic} aesthetic. ${elements.style.lighting}. Palette: ${elements.style.palette}. Mood: ${elements.style.mood}. High-fidelity rendering with crisp line work, layered lighting, subtle atmospheric perspective, cinematic quality suitable for production use.`
    );

    // Add mood context if available
    if (moodSummary) {
      promptParts.push(`Atmosphere cues from music: ${moodSummary}`);
    }

    // CRITICAL REQUIREMENTS (must be explicit)
    promptParts.push(
      "",
      "CRITICAL REQUIREMENTS - READ CAREFULLY:",
      "",
      "CAMERA MOVEMENT: ZERO - ABSOLUTELY FORBIDDEN",
      "- The camera is completely frozen, locked, and static - like a photograph on a tripod",
      "- NO camera movement of ANY kind: no zoom, no pan, no tilt, no dolly, no tracking, no rotation, no focus drift, no stabilization drift, no parallax, no camera shake, no handheld movement, no movement whatsoever",
      "- Camera position, angle, framing, and focus remain 100% static throughout the entire video",
      "- The camera frame is frozen in place from first frame to last frame",
      "",
      "PERFECT LOOP REQUIREMENTS:",
      "- First frame and last frame must be visually identical",
      "- All animated elements must return to their exact starting positions and states",
      "- Frame matching: camera position (static), lighting values, colors, particle positions, cloud shapes, water ripple states, leaf positions, lantern glow intensity, reflections, and shadows must match between first and last frames",
      "- All animations must be periodic and cyclic, completing exactly one full cycle",
      "- Motion must be mathematically loopable using sine waves, circular paths, or oscillating patterns",
      "- Single continuous shot only: no cuts, transitions, titles, logos, text, or black frames",
      "",
      "ANIMATION RESTRICTIONS - ENVIRONMENTAL EFFECTS ONLY:",
      "- ONLY environmental effects are allowed: weather (rain, snow), wind effects (leaves, fabric, flags swaying), lighting effects (neon signs, building lights flickering/pulsing), water surface effects (ripples, waves), atmospheric effects (fog, mist, steam), particle effects (dust, light particles), gentle plant/decorative swaying",
      "- FORBIDDEN: NO trains, vehicles, cars, buses, or any moving transportation. NO animals, birds, or living creatures. NO people or characters. NO boats, planes, or flying objects. NO complex moving machinery. NO moving objects of any kind - they cannot loop perfectly.",
      "- The scene should feel like a living photograph with minimal environmental animations only"
    );

    // Negative prompt (per guide's recommendation)
    promptParts.push(
      "",
      "Negative: NO camera movement of any kind, NO people or characters, NO cuts or transitions, NO text or logos, NO black frames, NO non-loopable motion, NO trains, NO vehicles, NO cars, NO buses, NO moving transportation, NO animals, NO birds, NO living creatures, NO boats, NO planes, NO flying objects, NO moving objects of any kind, NO complex moving machinery, NO complex animations, NO large-scale movement, NO camera shake, NO parallax, NO tracking shots. ONLY environmental effects are allowed."
    );

    return promptParts.join("\n");
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
