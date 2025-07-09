import { OpenAI } from "openai";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateCoverImage({ theme, prompt }) {
  console.log(`🎨 Generating DALL·E image with theme: ${theme}`);
  console.log(`🎨 Generating DALL·E image with prompt: ${prompt}`);

  const fullPrompt = `${prompt.trim()}\n\nImportant: Ensure the image contains no text, writing, or characters. The image must be entirely text-free.`;

  const response = await openai.images.generate({
    prompt: fullPrompt,
    model: "dall-e-3",
    n: 1,
    size: "1024x1024",
  });

  console.log("🧪 OpenAI Image Response:", response);

  const imageUrl = response.data[0].url;
  if (!imageUrl) {
    throw new Error("No image URL returned from OpenAI.");
  }

  const imageRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
  console.log(`🎨 DALL·E image fetched successfully`);
  return Buffer.from(imageRes.data);
}
