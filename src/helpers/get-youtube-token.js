import dotenv from "dotenv";
dotenv.config({ path: "../../.env" }); // Adjust if needed

import { google } from "googleapis";
import readline from "readline";

const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REDIRECT_URI } = process.env;

console.log("Loaded env:", {
  YT_CLIENT_ID,
  YT_CLIENT_SECRET,
  YT_REDIRECT_URI,
});

// 1. Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  YT_CLIENT_ID,
  YT_CLIENT_SECRET,
  YT_REDIRECT_URI
);

// 2. Generate the auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube", // ✅ required for playlists
  ],
  prompt: "consent",
});

console.log("\n🛰️ Authorize this app by visiting this URL:\n\n", authUrl, "\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 3. Get code from user and exchange for tokens
rl.question("🔑 Paste the authorization code here: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n✅ Access token:", tokens.access_token);
    console.log("🔁 Refresh token:", tokens.refresh_token);
    console.log("🗝️ Save this refresh token in your .env file like this:\n");
    console.log(`YT_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  } catch (err) {
    console.error("❌ Failed to retrieve tokens:", err.message);
  } finally {
    rl.close();
  }
});
