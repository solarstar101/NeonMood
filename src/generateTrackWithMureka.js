import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const API_ROOT = "https://api.mureka.ai";
const MAX_RETRIES = 20;
const DELAY_MS = 6000;
const MAX_PROMPT_LENGTH = 1024;

export async function generateTrackWithMureka(prompt) {
  // Trim prompt if it exceeds the API's limit
  if (prompt.length > MAX_PROMPT_LENGTH) {
    console.warn(
      `⚠️ Prompt exceeds ${MAX_PROMPT_LENGTH} characters. Trimming...`
    );
    prompt = prompt.slice(0, MAX_PROMPT_LENGTH);
  }

  let taskId;

  try {
    const genRes = await axios.post(
      `${API_ROOT}/v1/instrumental/generate`,
      {
        model: "auto",
        prompt,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.MUREKA_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    taskId = genRes.data?.id;
    if (!taskId) throw new Error("No task ID returned from MUREKA.");
    console.log(`⏳ Task created with ID: ${taskId}`);
  } catch (err) {
    console.error("❌ Failed to create Mureka task.");
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data);
    } else {
      console.error("Error message:", err.message);
    }
    throw err;
  }

  // Poll the /query endpoint
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const statusRes = await axios.get(
        `${API_ROOT}/v1/instrumental/query/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MUREKA_API_KEY}`,
          },
        }
      );

      const { status, choices, failed_reason } = statusRes.data;
      console.log(
        `🔁 Attempt ${attempt + 1}/${MAX_RETRIES} - Status: ${status}`
      );

      if (status === "succeeded" && choices?.length > 0) {
        const url = choices[0].url;
        const audioRes = await axios.get(url, { responseType: "arraybuffer" });
        console.log(`🎵 Track ready and downloaded!`);
        return Buffer.from(audioRes.data);
      }

      if (status === "failed" || status === "timeouted") {
        throw new Error(
          `❌ MUREKA task failed: ${failed_reason || "Unknown reason"}`
        );
      }
    } catch (err) {
      console.error("❌ Error while polling Mureka status:");
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);
      } else {
        console.error("Error message:", err.message);
      }
      throw err;
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  throw new Error(
    "❌ Track did not finish within the 2-minute polling window."
  );
}
