import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Expanded genres that work well in lofi style for study/focus
const genres = [
  "lofi hip-hop",
  "jazz-infused lofi",
  "ambient lofi",
  "chillhop",
  "synthwave lofi",
  "lofi boom bap",
  "vaporwave lofi",
  "instrumental chillhop",
  "ambient downtempo",
  "jazz-hop lofi",
  "dreamy electronica lofi",
  "instrumental trip-hop lofi",
  "slow-tempo electro jazz lofi",
  "lofi house",
  "lofi techno",
  "lofi indie",
  "lofi rock",
  "lofi pop",
  "lofi R&B",
  "lofi soul",
  "lofi funk",
  "lofi reggae",
  "lofi blues",
  "lofi classical",
  "lofi acoustic",
  "lofi piano",
  "lofi guitar",
  "lofi beats",
  "study beats",
  "focus music",
];

// Abstract moods per time of day (8 per slot)
const themeMoods = {
  morning: [
    "Gentle emergence of thought and calm energy.",
    "Subtle optimism rising with clarity.",
    "Emotionally light with a sense of freshness.",
    "Peaceful introspection unfolding into focus.",
    "Stillness paired with quiet anticipation.",
    "Balanced warmth with a soft emotional build.",
    "Serenity transitioning into inspiration.",
    "Harmonious flow of clarity and purpose.",
  ],
  midday: [
    "Elevated rhythm with grounded intensity.",
    "Mental sharpness aligned with steady flow.",
    "Confident pacing and emotional clarity.",
    "Stable motion layered with creative spark.",
    "Productive energy wrapped in smooth momentum.",
    "Forward drive balanced by emotional control.",
    "Energized focus without overstimulation.",
    "Dynamic harmony with persistent motion.",
  ],
  night: [
    "Deep introspection with emotional softness.",
    "Dreamlike flow with slow emotional release.",
    "Low-tempo thoughtfulness and gentle tension.",
    "Subdued energy wrapped in internal reflection.",
    "Fading light of the mind, layered with stillness.",
    "Subtle emotional depth in suspended time.",
    "Quiet intensity with a meditative undertone.",
    "Evening stillness with rich inner resonance.",
  ],
};

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomMood(slot) {
  return getRandom(themeMoods[slot]);
}

function getRandomGenre() {
  return getRandom(genres);
}

// Tempo ranges optimized for study/focus per time slot
const tempoRanges = {
  morning: { min: 60, max: 85, preferred: 70 }, // Gentle, awakening
  midday: { min: 75, max: 100, preferred: 85 }, // Productive, focused
  night: { min: 55, max: 75, preferred: 65 }, // Calm, introspective
};

// Instrumentation templates for lofi study music
const instrumentationTemplates = {
  minimal: ["soft piano", "warm synth pad", "vinyl crackle", "subtle bass"],
  jazz: ["mellow jazz piano", "upright bass", "soft brushed drums", "vinyl texture"],
  electronic: ["analog synth", "warm pad", "lo-fi drum machine", "vinyl sample"],
  acoustic: ["acoustic guitar", "soft piano", "gentle percussion", "ambient texture"],
  hybrid: ["piano", "synth pad", "soft bass", "vinyl crackle", "subtle drums"],
};

function getInstrumentationForGenre(genre) {
  const g = genre.toLowerCase();
  if (g.includes("jazz")) return instrumentationTemplates.jazz;
  if (g.includes("electronic") || g.includes("synthwave") || g.includes("techno") || g.includes("house")) return instrumentationTemplates.electronic;
  if (g.includes("acoustic") || g.includes("guitar") || g.includes("piano")) return instrumentationTemplates.acoustic;
  if (g.includes("ambient") || g.includes("minimal")) return instrumentationTemplates.minimal;
  return instrumentationTemplates.hybrid;
}

export async function generateSlotPrompts(slot) {
  const genre = getRandomGenre();
  const mood = getRandomMood(slot);
  const tempoRange = tempoRanges[slot];
  const instruments = getInstrumentationForGenre(genre);

  // Build prompt following Mureka guide's best practices:
  // Genre & Style, Mood & Emotion, Instrumentation, Tempo & Rhythm, Structure
  const prompt = `
You are an AI music designer specializing in creating study and focus music. Write a detailed, professional music prompt for Mureka AI to generate an instrumental-only ${genre} track optimized for ${slot} listening.

Time of day: ${slot.toUpperCase()}
Genre: ${genre}
Mood: ${mood}
Target tempo: ${tempoRange.preferred} BPM (range: ${tempoRange.min}-${tempoRange.max} BPM)

CRITICAL REQUIREMENTS - Follow Mureka's prompt best practices:

1. GENRE & STYLE: Clearly specify "${genre}" style with lofi characteristics (vinyl texture, warm analog feel, subtle imperfections).

2. MOOD & EMOTION: Convey "${mood}" - describe the emotional tone and energy level. Use specific emotional descriptors that guide chord progressions and melodic contours.

3. INSTRUMENTATION: Include these instruments: ${instruments.join(", ")}. Specify timbral qualities (e.g., "warm analog synth", "soft brushed drums", "mellow piano"). Add vinyl crackle and ambient textures for lofi authenticity.

4. TEMPO & RHYTHM: Set tempo to ${tempoRange.preferred} BPM (${tempoRange.min}-${tempoRange.max} BPM range). Describe the rhythmic feel (e.g., "slow, steady groove", "gentle swing", "relaxed four-on-the-floor").

5. STRUCTURE: Suggest a simple structure suitable for study/focus: gentle intro, main loop with subtle variations, smooth transitions. Keep it non-distracting and repetitive enough for concentration.

6. PRODUCTION STYLE: Specify lofi production characteristics: warm analog feel, subtle vinyl crackle, soft compression, gentle reverb, tape saturation, low-pass filtering for that classic lofi aesthetic.

7. NEGATIVE PROMPTS: Explicitly state: NO vocals, NO vocal samples, NO lyrics, NO distracting elements, NO sudden changes, NO high-energy drops.

Format your response as a single, flowing music prompt (under 1000 characters) that Mureka AI can directly use. Be specific with adjectives and technical terms. Return ONLY the music prompt text - no explanations, no JSON, no markdown formatting.
`;

  const res = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4",
    temperature: 0.85, // Slightly lower for more consistent, focused outputs
  });

  const text = res.choices[0].message.content.trim();
  
  // Clean up any markdown or formatting that might have slipped through
  const cleanedText = text
    .replace(/^```[\w]*\n?/g, '') // Remove code blocks
    .replace(/```$/g, '')
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italics
    .replace(/^["']|["']$/g, '') // Remove quotes
    .trim();

  return { musicPrompt: cleanedText, genre, mood };
}
