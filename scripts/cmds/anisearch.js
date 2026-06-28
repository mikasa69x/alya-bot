const axios = require("axios");

module.exports = {
  config: {
    name: "anisearch",
    aliases: ["amv", "animesearch"],
    version: "1.0",
    author: "xalman",
    countDown: 3,
    role: 0,
    description: "Search and get Anime TikTok videos",
    category: "anime",
    guide: "{pn} <anime name>"
  },

  onStart: async function ({ message, args }) {
    const query = args.join(" ");
    if (!query) return message.reply("Please provide an anime name to search.");

    const API_URL = `https://xalman-apis.vercel.app/api/anisearch?q=${encodeURIComponent(query)}`;

    try {
      message.reply(`Searching for "${query}"...`);
      const res = await axios.get(API_URL);
      const results = res.data.results;

      if (!results || results.length === 0) {
        return message.reply("No videos found for your search.");
      }

      const video = results[0]; 
      const stream = await global.utils.getStreamFromURL(video.video_url);

      return message.reply({
        body: `🌸✨`,
        attachment: stream
      });

    } catch (e) {
      console.error(e);
      return message.reply("❌ Error fetching video from TikTok.");
    }
  }
};
