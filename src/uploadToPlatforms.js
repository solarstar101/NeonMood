import { uploadToYouTube } from "./uploads/youtube/youtube.js";
import { uploadToAudius } from "./uploads/audius.js";

export async function uploadToPlatforms(
  slot,
  audioBuffer,
  imageBuffer,
  metadata
) {
  const platforms = [uploadToYouTube, uploadToAudius];

  for (const uploadFn of platforms) {
    try {
      await uploadFn(slot, audioBuffer, imageBuffer, metadata);
    } catch (err) {
      console.error(
        `⚠️ Failed upload on platform: ${uploadFn.name} → ${err.message}`
      );
    }
  }
}
