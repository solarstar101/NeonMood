import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const genres = [
  "retro Japanese city pop",
  "hip-hop lofi",
  "jazz-infused lofi",
  "ambient lofi",
  "chillhop",
  "synthwave lofi",
  "instrumental boom bap",
  "vaporwave lofi",
  "instrumental chillhop",
  "ambient downtempo",
  "jazz-hop",
  "synthwave",
  "dreamy electronica",
  "lofi boom bap",
  "experimental ambient",
  "instrumental trip-hop",
  "slow-tempo electro jazz",
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

export async function generateSlotPrompts(slot) {
  const genre = getRandomGenre();
  const mood = getRandomMood(slot);

  const prompt = `
You are an AI music designer. Write a creative music prompt for generating an instrumental-only ${genre} track.

Time of day: ${slot.toUpperCase()}
Mood: ${mood}

Requirements:
- Keep the full prompt under 1000 characters.
- Focus on mood, tempo, and key instruments (e.g., synths, bass, guitar, drums, vinyl textures, ambient noise).
- Absolutely no vocals or vocal samples.
- Return only the music prompt as plain text. No JSON or markdown.
`;

  const res = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4",
    temperature: 0.9,
  });

  const text = res.choices[0].message.content.trim();
  return { musicPrompt: text, genre, mood };
}
