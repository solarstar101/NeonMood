import { uploadToYouTube } from "./uploads/youtube/youtube.js";
import { uploadToAudius } from "./uploads/audius.js";

// Re-export for conditional logic
export { uploadToYouTube };

export async function uploadToPlatforms(
  slot,
  audioBuffer,
  imageBuffer,
  metadata,
  videoBuffer = null
) {
  const platforms = [uploadToYouTube, uploadToAudius];

  for (const uploadFn of platforms) {
    try {
      await uploadFn(slot, audioBuffer, imageBuffer, metadata, videoBuffer);
    } catch (err) {
      console.error(
        `⚠️ Failed upload on platform: ${uploadFn.name} → ${err.message}`
      );
    }
  }
}
