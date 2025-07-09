import cron from "node-cron";
import { exec } from "node:child_process";

function runSlot(slot) {
  console.log(`🚀 Running slot: ${slot}`);
  exec(`node index.js ${slot}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ Error running ${slot}:`, err.message);
    } else {
      console.log(`✅ Output for ${slot}:\n${stdout}`);
    }
  });
}

// Run at 7:00 AM CST
cron.schedule("0 10 * * *", () => runSlot("morning"), {
  timezone: "America/Chicago",
});

// Run at 12:00 PM CST
cron.schedule("0 12 * * *", () => runSlot("midday"), {
  timezone: "America/Chicago",
});

// Run at 8:00 PM CST
cron.schedule("0 20 * * *", () => runSlot("night"), {
  timezone: "America/Chicago",
});

console.log("⏱ Local cron scheduler running with CST timezone...");
