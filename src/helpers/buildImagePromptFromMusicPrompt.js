export function buildImagePromptFromMusicPrompt(musicPrompt, slot) {
  const basePrompt = `Anime-style album cover inspired by the following: "${musicPrompt}".
 during the ${slot}, Illustration should blend cozy 1980s city pop fashion with a sleek, modern setting. Consistent anime cover art style.`;

  return basePrompt.length > 1000
    ? basePrompt.slice(0, 995) + "..."
    : basePrompt;
}
