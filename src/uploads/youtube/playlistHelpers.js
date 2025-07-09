import { google } from "googleapis";

export async function getOrCreatePlaylist(slot, oauth2Client) {
  const slotKey = slot.toUpperCase();
  const envKey = `YOUTUBE_PLAYLIST_ID_${slotKey}`;
  const playlistId = process.env[envKey];

  if (playlistId) {
    console.log(`🎯 Using existing playlist for ${slot}: ${playlistId}`);
    return playlistId;
  }

  throw new Error(
    `❌ No playlist ID found for slot "${slot}". Please set ${envKey} in your .env.`
  );
}

export async function addVideoToPlaylist(videoId, playlistId, oauth2Client) {
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  await youtube.playlistItems.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId,
        },
      },
    },
  });

  console.log(`➕ Added video ${videoId} to playlist ${playlistId}`);
}
