const axios = require('axios');

module.exports = {
  config: {
    name: "sing",
    version: "2.6",
    author: "xiyam",
    countDown: 5,
    role: 0,
    shortDescription: "Search, Link, or Reply to download MP3",
    longDescription: "Download MP3 by searching, providing a link, or replying to a link.",
    category: "music",
    guide: "{p}sing <name> OR {p}sing <link> OR reply to a link with {p}sing"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply } = event;
    const BASE_URL = "https://xalman-apis.vercel.app/api";
    let query = args.join(" ");
    
    if (messageReply && messageReply.body) {
      const match = messageReply.body.match(/(https?:\/\/[^\s]+)/);
      if (match && match[0].includes("youtu")) {
        return downloadAudio(api, threadID, messageID, match[0], BASE_URL);
      }
    }

    if (query && query.includes("youtu")) {
      return downloadAudio(api, threadID, messageID, query, BASE_URL);
    }

    if (!query) {
      return api.sendMessage("❌ Please provide a song name, link, or reply to a link!", threadID, messageID);
    }

    try {
      const { data } = await axios.get(`${BASE_URL}/ytsearch?q=${encodeURIComponent(query)}`);
      const results = data.results?.slice(0, 5);

      if (!results || results.length === 0) {
        return api.sendMessage("❌ No songs found.", threadID, messageID);
      }

      let msg = `🎵 𝗠𝘂𝘀𝗶𝗰 𝗦𝗲𝗮𝗿𝗰𝗵 𝗥𝗲𝘀𝘂𝗹𝘁𝘀\n━━━━━━━━━━━━━━━\n`;
      let attachments = [];

      for (let i = 0; i < results.length; i++) {
        const video = results[i];
        msg += `${i + 1}. ${video.title}\n⏱️ ${video.duration} | 📺 ${video.channel}\n\n`;
        
        if (video.thumbnail) {
          try {
            const img = await axios.get(video.thumbnail, { responseType: 'stream' });
            attachments.push(img.data);
          } catch (e) {}
        }
      }

      msg += `━━━━━━━━━━━━━━━\n📥 Reply with 𝟭-𝟱 to download MP3.`;

      return api.sendMessage({ body: msg, attachment: attachments }, threadID, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: senderID,
          results: results,
          baseUrl: BASE_URL
        });
      }, messageID);

    } catch (e) {
      return api.sendMessage("⚠️ Search failed. Please try again.", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, messageID, body, senderID } = event;
    const { results, author, baseUrl } = Reply;

    if (senderID !== author) return;

    const index = parseInt(body) - 1;
    if (isNaN(index) || index < 0 || index > 4) {
      return api.sendMessage("❌ Invalid choice. Choose 1-5.", threadID, messageID);
    }

    const selected = results[index];
    api.unsendMessage(Reply.messageID);
    return downloadAudio(api, threadID, event.messageID, selected.url, baseUrl, selected.duration);
  }
};

async function downloadAudio(api, threadID, messageID, url, baseUrl, duration = null) {
  const waitMsg = await api.sendMessage(`⏳ Processing Audio... please wait.`, threadID);

  try {
    const res = await axios.get(`${baseUrl}/ytmp3?url=${encodeURIComponent(url)}`);
    const data = res.data;

    if (!data.status || !data.url) {
      return api.editMessage("❌ Failed to fetch audio link.", waitMsg.messageID);
    }

    const fileStream = await axios.get(data.url, { responseType: 'stream' });
    const timeInfo = duration || data.duration || "N/A";

    await api.unsendMessage(waitMsg.messageID);
    return api.sendMessage({
      body: `📝 𝗧𝗶𝘁𝗹𝗲: ${data.title}\n⏱️ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: ${timeInfo}`,
      attachment: fileStream.data
    }, threadID, messageID);

  } catch (e) {
    return api.editMessage("⚠️ Error! File too large or API issues.", waitMsg.messageID);
  }
}
