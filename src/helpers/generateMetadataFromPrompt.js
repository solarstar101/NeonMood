import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateMetadataFromPrompt(slot, musicPrompt) {
  const system = `
You are a music marketing assistant. 
Based on a provided time-of-day slot (morning, midday, or night) and a music description prompt, 
generate a compelling YouTube title, an engaging SEO-optimized description, and a short list of relevant tags. 

Requirements:
- The title should be unique, evocative, and accurately reflect the vibe and genre of the music as described in the prompt.
- Do NOT force generic genre tags like "City Pop" unless the music description specifically indicates that style.
- The description should be 2–3 sentences long and naturally describe the music's mood, style, and characteristics as indicated in the prompt.
- Tags should be lowercase, relevant to the actual music described, and YouTube-friendly (e.g., ["lofi", "ambient", "chill beats"] or ["synthwave", "cyberpunk", "electronic"] depending on the actual music style).
- Only use genres and styles that match what is described in the music prompt.
- Do **not** mention AI, automation, or anything synthetic in the output.
- Do **not** include markdown, code blocks, or explanations.

Respond only with a valid JSON object with the following keys: "title", "description", and "tags" (as an array).
`;

  const user = `
Slot: ${slot}
Prompt: ${musicPrompt}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: system.trim() },
      { role: "user", content: user.trim() },
    ],
    temperature: 0.85, // slightly creative
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed;
}
