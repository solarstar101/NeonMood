import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL =
  process.env.OPENAI_API_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  throw new Error("OPENAI_API_KEY is required for Sora video generation");
}

const DEFAULT_MODEL = process.env.SORA_MODEL || "sora-2-pro";
const DEFAULT_DURATION_SECONDS = Number(process.env.SORA_DURATION_SECONDS || 8);
const SUPPORTED_SIZES = new Set([
  "720x1280",
  "1280x720",
  "1024x1792",
  "1792x1024",
]);

const envSize = process.env.SORA_SIZE;
let resolvedSize =
  envSize && SUPPORTED_SIZES.has(envSize) ? envSize : "1280x720";
if (envSize && !SUPPORTED_SIZES.has(envSize)) {
  console.warn(
    `⚠️ Unsupported Sora size '${envSize}'. Falling back to ${resolvedSize}. Supported values: ${Array.from(
      SUPPORTED_SIZES
    ).join(", ")}`
  );
}
const DEFAULT_SIZE = resolvedSize;

const SCENE_TEMPLATES = [
  {
    id: "city_neon_rooftop",
    keywords: ["city", "neon", "urban", "metropolis", "night", "downtown"],
    slotAffinity: ["night"],
    description:
      "Still frame lo-fi anime night city skyline viewed from a fixed rooftop vantage. The camera is completely locked like a photograph - absolutely no camera movement. Only subtle, repeating animations: neon lights flickering in periodic cycles, gentle rain falling in continuous loops, distant clouds drifting in repeating patterns, and steam rising in cyclical waves. No people present. Style: 1980s hand-drawn anime OVA with vibrant neon reflections, atmospheric haze, and warm VHS grain.",
  },
  {
    id: "city_sunrise_terrace",
    keywords: ["sunrise", "dawn", "morning", "city", "skyline", "golden"],
    slotAffinity: ["morning"],
    description:
      "Still frame anime sunrise over a calm city terrace. The camera is completely locked - no movement whatsoever. Only subtle, repeating animations: morning fog rolling in periodic waves, hanging lanterns flickering gently in cycles, leaves swaying in repeating patterns from a gentle breeze, and light particles drifting in loops. No people, only tranquil urban ambience. Style: 1980s anime OVA with warm film grain and delicate lighting transitions.",
  },
  {
    id: "park_pond_lanterns",
    keywords: ["park", "pond", "cherry", "lantern", "garden", "sakura"],
    slotAffinity: ["midday"],
    description:
      "Still frame anime park pond at late afternoon. The camera is completely still - locked like a photograph. Only subtle, repeating animations: cherry blossoms drifting in continuous loops, water ripples from gentle breezes in periodic patterns, stone lanterns flickering softly in cycles, branches swaying in repeating motions, and koi fish creating gentle ripple patterns that loop. No characters present. Style: 1980s anime OVA with pastel palette and soft depth of field.",
  },
  {
    id: "mountain_teahouse",
    keywords: ["mountain", "ridge", "teahouse", "lantern", "blossom", "grass"],
    slotAffinity: ["morning", "night"],
    description:
      "Still frame anime mountain ridge with a wooden teahouse and glowing lanterns. The camera is completely locked - absolutely no movement. Only subtle, repeating animations: cherry blossoms and tall grass swaying in periodic waves, lanterns flickering gently in cycles, vapor clouds drifting in repeating patterns, and gentle wind moving foliage in loops. Serene ambience. Style: 1980s anime OVA with warm grain and dreamy colors.",
  },
  {
    id: "coastal_boardwalk",
    keywords: ["beach", "ocean", "coast", "shore", "waves", "sea", "harbor"],
    slotAffinity: ["midday", "afternoon"],
    description:
      "Still frame anime coastal boardwalk at golden hour. The camera is completely still - locked like a photograph. Only subtle, repeating animations: waves rolling in continuous loops, lantern-lit kiosks flickering gently in cycles, flags or fabric swaying in repeating patterns from wind, and light reflections dancing in loops. Style: 1980s anime OVA with sparkling highlights, warm VHS grain, and soft reflections.",
  },
  {
    id: "forest_fireflies",
    keywords: ["forest", "woods", "grove", "fireflies", "nature", "glade"],
    slotAffinity: ["night", "morning"],
    description:
      "Still frame anime forest clearing at twilight. The camera is completely fixed - no movement whatsoever. Only subtle, repeating animations: light particles drifting in periodic orbits, mist swirling in repeating layers, foliage swaying in cyclical patterns from gentle wind, and light filtering through leaves in loops. No human presence. Style: 1980s anime OVA with luminous highlights and deep emerald tones.",
  },
  {
    id: "rainy_alley",
    keywords: ["rain", "alley", "shower", "storm", "wet", "puddle"],
    slotAffinity: ["night"],
    description:
      "Still frame anime rain-soaked alley with neon signage. The camera is completely still - locked like a photograph. Only subtle, repeating animations: rain falling in continuous loops, reflections rippling on puddles in periodic patterns, neon lights flickering gently in cycles, steam vents pulsing in repeating motions, and hanging signs swaying in loops from wind. Style: 1980s anime OVA with glossy highlights and moody lighting.",
  },
  {
    id: "desert_dusk_canyon",
    keywords: ["desert", "canyon", "mesa", "sand", "dune", "sunset"],
    slotAffinity: ["midday"],
    description:
      "Still frame anime desert canyon at sunset. The camera is completely locked - no movement whatsoever. Only subtle, repeating animations: dune grasses shimmering in periodic waves from gentle breezes, dust motes drifting in continuous loops, light rays shifting in repeating patterns, and sand particles moving in cyclical flows. Atmosphere calm and expansive. Style: 1980s anime OVA with warm amber and violet gradients.",
  },
  {
    id: "aurora_glacier",
    keywords: ["aurora", "glacier", "ice", "snow", "polar", "arctic"],
    slotAffinity: ["night"],
    description:
      "Still frame anime polar vista under dancing aurora. The camera is completely still - locked like a photograph. Only subtle, repeating animations: aurora curtains rippling in periodic waves, snow falling in continuous loops, ice shards glinting in repeating patterns, and light reflections dancing in cycles. No people. Style: 1980s anime OVA with crystalline highlights and cool pastels.",
  },
  {
    id: "space_window_orbit",
    keywords: ["space", "nebula", "orbit", "stars", "galaxy", "cosmic"],
    slotAffinity: ["night"],
    description:
      "Still frame anime orbital observatory view. The camera is completely locked inside the observation deck window - absolutely no movement. Only subtle, repeating animations: nebula clouds swirling in periodic patterns, instrument lights pulsing rhythmically in cycles, stars twinkling in repeating sequences, and light particles drifting in loops. Style: 1980s space anime with luminous gradients and subtle parallax.",
  },
  {
    id: "lakeside_mist",
    keywords: ["lake", "mist", "water", "valley", "reflection"],
    slotAffinity: ["morning", "midday"],
    description:
      "Still frame anime lakeside panorama at dawn. The camera is completely fixed - no movement whatsoever. Only subtle, repeating animations: mist rolling in periodic waves, floating lanterns flickering gently in cycles, water ripples in repeating patterns, leaves or reeds swaying in loops from gentle wind, and light reflections dancing continuously. Quiet atmospheric motion only. Style: 1980s anime OVA with gentle grain and pearlescent light.",
  },
  {
    id: "futuristic_monorail",
    keywords: ["future", "cyber", "synth", "neon", "rail", "monorail", "tower"],
    slotAffinity: ["night", "midday"],
    description:
      "Still frame futuristic anime skyline with elevated monorails. The camera is completely locked - no movement whatsoever. Only subtle, repeating animations: holographic billboards flickering in periodic cycles, neon lights pulsing in repeating patterns, volumetric clouds drifting in loops, light particles floating in continuous cycles, and electronic displays animating rhythmically. High-tech ambiance, no characters. Style: 1980s cyber-OVA with neon bloom and chromatic haze.",
  },
];

function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function pickTemplateCandidate(candidates, seed) {
  if (!candidates.length) {
    candidates = SCENE_TEMPLATES;
  }
  const hash = Math.abs(stringHash(seed));
  const index = hash % candidates.length;
  return candidates[index];
}

function pickSceneTemplate(musicPrompt = "", slot = "") {
  const lower = musicPrompt.toLowerCase();
  
  // PRIORITY 1: Match by slot first to ensure time-of-day consistency
  const slotMatches = SCENE_TEMPLATES.filter((tpl) =>
    tpl.slotAffinity?.includes(slot)
  );

  // PRIORITY 2: Filter slot matches by keywords if available
  const keywordMatches = slotMatches.length
    ? slotMatches.filter((tpl) =>
        tpl.keywords.some((kw) => lower.includes(kw))
      )
    : [];

  // PRIORITY 3: If no keyword matches within slot, use all slot matches
  // PRIORITY 4: If no slot matches, fall back to keyword matches (but this shouldn't happen)
  // PRIORITY 5: Final fallback to all templates
  const candidates = keywordMatches.length
    ? keywordMatches
    : slotMatches.length
    ? slotMatches
    : SCENE_TEMPLATES.filter((tpl) =>
        tpl.keywords.some((kw) => lower.includes(kw))
      ).length
    ? SCENE_TEMPLATES.filter((tpl) =>
        tpl.keywords.some((kw) => lower.includes(kw))
      )
    : SCENE_TEMPLATES;

  return pickTemplateCandidate(candidates, `${slot}|${musicPrompt}`);
}

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

function extractColorPalette(sceneTemplate) {
  // Extract color cues from scene descriptions and provide 3-5 color anchors
  const desc = sceneTemplate.description.toLowerCase();
  const colors = [];
  
  if (desc.includes("neon") || desc.includes("night")) {
    colors.push("cyan", "magenta", "amber", "deep blue", "electric pink");
  } else if (desc.includes("sunrise") || desc.includes("dawn") || desc.includes("golden")) {
    colors.push("amber", "peach", "cream", "warm orange", "soft yellow");
  } else if (desc.includes("cherry") || desc.includes("sakura") || desc.includes("pastel")) {
    colors.push("soft pink", "lavender", "pearl white", "mint green", "pale blue");
  } else if (desc.includes("forest") || desc.includes("emerald")) {
    colors.push("deep emerald", "moss green", "sage", "forest brown", "olive");
  } else if (desc.includes("aurora") || desc.includes("polar") || desc.includes("cool")) {
    colors.push("icy blue", "lilac", "silver", "pale cyan", "frost white");
  } else if (desc.includes("desert") || desc.includes("sunset") || desc.includes("amber")) {
    colors.push("warm amber", "terracotta", "sand", "violet", "burnt orange");
  } else {
    colors.push("warm gray", "soft beige", "muted blue", "sage green", "cream");
  }
  
  return colors.slice(0, 5);
}

function adjustSceneDescriptionForSlot(description, slot) {
  // Ensure the scene description explicitly matches the time of day
  const lowerDesc = description.toLowerCase();
  const isMorning = slot === "morning";
  const isMidday = slot === "midday";
  const isNight = slot === "night";

  // Replace time-of-day references to match the slot
  let adjusted = description;

  if (isMorning) {
    // Replace night references with morning
    adjusted = adjusted.replace(/night/gi, "morning");
    adjusted = adjusted.replace(/twilight/gi, "dawn");
    adjusted = adjusted.replace(/evening/gi, "morning");
    adjusted = adjusted.replace(/sunset/gi, "sunrise");
    adjusted = adjusted.replace(/dusk/gi, "dawn");
    adjusted = adjusted.replace(/late afternoon/gi, "early morning");
    adjusted = adjusted.replace(/golden hour/gi, "golden hour sunrise");
    // Ensure morning-specific elements
    if (!lowerDesc.includes("morning") && !lowerDesc.includes("dawn") && !lowerDesc.includes("sunrise")) {
      adjusted = adjusted.replace(/at /gi, "at morning ");
    }
  } else if (isMidday) {
    // Replace night/morning references with midday
    adjusted = adjusted.replace(/night/gi, "midday");
    adjusted = adjusted.replace(/morning/gi, "midday");
    adjusted = adjusted.replace(/dawn/gi, "midday");
    adjusted = adjusted.replace(/sunrise/gi, "midday");
    adjusted = adjusted.replace(/twilight/gi, "midday");
    adjusted = adjusted.replace(/evening/gi, "midday");
    adjusted = adjusted.replace(/sunset/gi, "midday");
    adjusted = adjusted.replace(/dusk/gi, "midday");
    adjusted = adjusted.replace(/late afternoon/gi, "midday");
    adjusted = adjusted.replace(/golden hour/gi, "bright midday");
    // Ensure midday-specific elements
    if (!lowerDesc.includes("midday") && !lowerDesc.includes("afternoon") && !lowerDesc.includes("noon")) {
      adjusted = adjusted.replace(/at /gi, "at midday ");
    }
  } else if (isNight) {
    // Replace morning/midday references with night
    adjusted = adjusted.replace(/morning/gi, "night");
    adjusted = adjusted.replace(/midday/gi, "night");
    adjusted = adjusted.replace(/dawn/gi, "night");
    adjusted = adjusted.replace(/sunrise/gi, "night");
    adjusted = adjusted.replace(/afternoon/gi, "night");
    adjusted = adjusted.replace(/noon/gi, "night");
    adjusted = adjusted.replace(/golden hour/gi, "night");
    adjusted = adjusted.replace(/bright/gi, "dark");
    // Ensure night-specific elements
    if (!lowerDesc.includes("night") && !lowerDesc.includes("evening") && !lowerDesc.includes("twilight")) {
      adjusted = adjusted.replace(/at /gi, "at night ");
    }
  }

  return adjusted;
}

function buildSoraPrompt(musicPrompt, slot) {
  const sceneTemplate = pickSceneTemplate(musicPrompt, slot);
  const moodSummary = extractMoodSummary(musicPrompt);
  const colorPalette = extractColorPalette(sceneTemplate);

  // Extract key elements from scene template and adjust for slot
  let sceneDesc = sceneTemplate.description;
  sceneDesc = adjustSceneDescriptionForSlot(sceneDesc, slot);
  
  // Determine camera framing based on scene
  let cameraFraming = "wide establishing shot, eye level";
  if (sceneDesc.includes("rooftop") || sceneDesc.includes("panorama")) {
    cameraFraming = "wide establishing shot, eye level, fixed vantage point";
  } else if (sceneDesc.includes("pond") || sceneDesc.includes("lake")) {
    cameraFraming = "wide shot, eye level, stable composition";
  } else if (sceneDesc.includes("alley") || sceneDesc.includes("narrow")) {
    cameraFraming = "medium-wide shot, eye level, locked frame";
  }

  // Build prompt following Sora guide structure
  const promptParts = [];

  // Style section (most powerful lever - establish early)
  if (sceneDesc.includes("1980s")) {
    promptParts.push(
      "Style: 1980s hand-drawn anime OVA aesthetic with warm film grain, atmospheric haze, and nostalgic color grading. The visual language evokes classic anime backgrounds with layered lighting and subtle VHS-style texture."
    );
  } else {
    promptParts.push(
      "Style: Anime animation aesthetic with cinematic quality, layered lighting, and atmospheric depth. Visual style should feel like a living photograph with subtle, beautiful motion."
    );
  }

  // Prose scene description
  promptParts.push(sceneDesc);

  // Add mood context if available
  if (moodSummary) {
    promptParts.push(`Atmosphere cues from music: ${moodSummary}`);
  }

  // Cinematography section (following guide structure)
  promptParts.push(
    "Cinematography:",
    `Camera shot: ${cameraFraming}`,
    "Camera movement: ZERO camera movement. The camera is completely frozen and locked in place - like a tripod-mounted photograph. Absolutely NO movement of any kind: no zoom, no pan, no tilt, no dolly, no tracking, no rotation, no focus drift, no stabilization drift, no parallax, no camera shake, no handheld movement. The camera position, angle, and framing remain 100% static throughout the entire video.",
    "Depth of field: Deep focus (foreground and background both sharp, maintaining clarity throughout)",
    `Lighting: ${sceneDesc.includes("night") ? "Neon and practical lights with cool rim lighting" : sceneDesc.includes("sunrise") || sceneDesc.includes("dawn") ? "Warm natural key with soft fill, golden hour quality" : "Balanced natural lighting with atmospheric depth"}`,
    `Palette anchors: ${colorPalette.join(", ")}`,
    "Mood: Tranquil, meditative, a living still photograph with minimal subtle motion"
  );

  // Actions section - specific beats for loop-friendly animations
  // These are the ONLY types of animations allowed - all must be periodic and loopable
  const actions = [];
  if (sceneDesc.includes("rain")) {
    actions.push("- Rain: falling in continuous, periodic loops, completing exactly one cycle");
  }
  if (sceneDesc.includes("snow") || sceneDesc.includes("winter")) {
    actions.push("- Snow: drifting in continuous loops, returning to starting positions");
  }
  if (sceneDesc.includes("flickering") || sceneDesc.includes("neon") || sceneDesc.includes("lantern") || sceneDesc.includes("light")) {
    actions.push("- Building lights: flickering or pulsing in smooth periodic cycles, returning to starting brightness");
  }
  if (sceneDesc.includes("clouds") || sceneDesc.includes("mist") || sceneDesc.includes("fog")) {
    actions.push("- Atmospheric elements: mist, fog, or clouds drifting in repeating patterns, completing full cycles");
  }
  if (sceneDesc.includes("swaying") || sceneDesc.includes("leaves") || sceneDesc.includes("branches") || sceneDesc.includes("wind")) {
    actions.push("- Wind effects: leaves, grass, fabric, flags, or branches swaying in gentle oscillating motions, returning to starting positions");
  }
  if (sceneDesc.includes("ripples") || sceneDesc.includes("water") || sceneDesc.includes("waves") || sceneDesc.includes("pond")) {
    actions.push("- Water surface effects: ripples and waves moving in continuous loops, matching first and last frame states");
  }
  if (sceneDesc.includes("particles") || sceneDesc.includes("dust")) {
    actions.push("- Particle effects: dust or light particles drifting in closed circular paths, returning to starting positions");
  }
  if (sceneDesc.includes("steam") || sceneDesc.includes("smoke")) {
    actions.push("- Steam or smoke: rising in cyclical waves, completing periodic patterns");
  }
  
  // Always include a note about minimal animations
  promptParts.push("Actions - ONLY environmental effects are allowed (NO moving objects):");
  if (actions.length > 0) {
    actions.forEach(action => promptParts.push(action));
  } else {
    promptParts.push("- Subtle environmental effects: gentle particles or light shifts completing one full cycle, returning all elements to starting states");
  }
  promptParts.push("");
  promptParts.push("ALLOWED - Environmental effects only (these can loop perfectly):");
  promptParts.push("- Weather effects: rain falling in periodic loops, snow drifting in continuous loops");
  promptParts.push("- Wind effects: leaves, grass, fabric, flags, branches swaying in repeating patterns");
  promptParts.push("- Lighting effects: neon signs, streetlights, window lights, building lights flickering or pulsing in periodic cycles");
  promptParts.push("- Water effects: ripples, waves, pond surfaces, water reflections moving in continuous loops (NO fountains with jets - only surface effects)");
  promptParts.push("- Atmospheric effects: fog/mist rolling in periodic waves, steam/smoke rising in cyclical waves");
  promptParts.push("- Particle effects: dust, light particles drifting in closed circular paths (NO fireflies - they move too randomly)");
  promptParts.push("- Gentle swaying: plants, decorations, or hanging elements moving in cyclical patterns");
  promptParts.push("");
  promptParts.push("FORBIDDEN - NO moving objects (these cannot loop perfectly):");
  promptParts.push("- NO trains, vehicles, cars, buses, or any moving transportation");
  promptParts.push("- NO animals, birds, or any living creatures");
  promptParts.push("- NO people or characters");
  promptParts.push("- NO boats, planes, or flying objects");
  promptParts.push("- NO complex moving machinery or mechanical objects");
  promptParts.push("- ONLY environmental effects that repeat in perfect cycles");
  promptParts.push("");
  promptParts.push("ALL animations must be periodic and cyclic - completing exactly one full cycle by the final frame and returning to starting states.");

  // Critical loop requirements (must be clear and explicit)
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

  // Technical and rendering notes
  promptParts.push(
    "",
    "Technical:",
    "- High-fidelity rendering with crisp line work and layered lighting",
    "- Subtle atmospheric perspective and cinematic quality",
    "- Provide visuals only; accompanying audio from render will be discarded",
    "- Remember: ONLY environmental effects - NO trains, vehicles, moving objects, or anything that cannot loop perfectly"
  );

  return promptParts.join("\n");
}

async function soraApiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let details = await response.text();
    try {
      const parsed = JSON.parse(details);
      details = JSON.stringify(parsed, null, 2);
    } catch (_) {
      // keep raw
    }
    throw new Error(
      `Sora API request failed (status ${response.status}): ${details}`
    );
  }

  const isBinaryContent =
    options.method === "GET" && /\/videos\/.*\/content/.test(path);
  if (isBinaryContent) {
    return response;
  }

  return response.json();
}

async function createSoraJob(payload) {
  return soraApiRequest("/videos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function retrieveSoraJob(id) {
  return soraApiRequest(`/videos/${id}`, {
    method: "GET",
  });
}

async function downloadSoraVideo(id, variant = "video") {
  return soraApiRequest(`/videos/${id}/content?variant=${variant}`, {
    method: "GET",
    headers: {
      Accept: "application/octet-stream",
    },
  });
}

export async function generateVideoWithSora({
  slot,
  musicPrompt,
  model = DEFAULT_MODEL,
  seconds = DEFAULT_DURATION_SECONDS,
  size = DEFAULT_SIZE,
  pollIntervalMs = 5000,
} = {}) {
  if (!musicPrompt) {
    throw new Error("musicPrompt is required for Sora video generation");
  }

  const prompt = buildSoraPrompt(musicPrompt, slot);
  console.log("🎬 Sora prompt:\n", prompt);

  console.log(
    `🚀 Submitting Sora video generation job (model=${model}, duration=${seconds}s, size=${size})`
  );

  let job;
  try {
    job = await createSoraJob({
      model,
      prompt,
      seconds: seconds.toString(),
      size,
    });
  } catch (err) {
    console.error("❌ Failed to create Sora video job", err.message);
    throw err;
  }

  console.log(
    `🆔 Sora job created: id=${job.id}, status=${job.status}, progress=${
      job.progress ?? 0
    }%`
  );

  while (job.status === "queued" || job.status === "in_progress") {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    job = await retrieveSoraJob(job.id);
    const progress = job.progress ?? 0;
    const barLength = 20;
    const filled = Math.floor((progress / 100) * barLength);
    const bar = "#".repeat(filled) + "-".repeat(barLength - filled);
    console.log(
      `⌛ Sora status=${job.status} progress=${progress.toFixed(1)}% [${bar}]`
    );
  }

  if (job.status !== "completed") {
    console.error("❌ Sora job error details:", JSON.stringify(job, null, 2));
    console.error(
      "💡 Next steps: verify the prompt complies with Sora preview policies (scenic, all-ages, no people). Adjust prompt and retry."
    );
    throw new Error(
      `Sora video generation failed: status=${job.status} error=${
        job.error ? JSON.stringify(job.error) : "unknown"
      }`
    );
  }

  console.log("✅ Sora video completed. Downloading content...");
  let contentResponse;
  try {
    contentResponse = await downloadSoraVideo(job.id);
  } catch (downloadErr) {
    console.error("❌ Failed to download Sora video content:", downloadErr);
    console.error(
      "💡 Next steps: try re-running the job. If the issue persists, check API availability or download via curl using the video ID."
    );
    throw downloadErr;
  }

  let arrayBuffer;
  try {
    arrayBuffer = await contentResponse.arrayBuffer();
  } catch (bufferErr) {
    console.error(
      "❌ Failed to read Sora video response as arrayBuffer:",
      bufferErr
    );
    console.error(
      "💡 Next steps: confirm the response is binary video data. You can inspect headers or download manually via curl."
    );
    throw bufferErr;
  }

  const buffer = Buffer.from(arrayBuffer);
  console.log(
    `📦 Downloaded Sora video (${(buffer.length / (1024 * 1024)).toFixed(
      2
    )} MB)`
  );

  return {
    buffer,
    job,
    prompt,
    metadata: {
      model,
      seconds,
      size,
      slot,
    },
  };
}
