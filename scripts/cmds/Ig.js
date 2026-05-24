const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

if (!global.instaMemory) global.instaMemory = new Set();

module.exports = {
  config: {
    name: "ig",
    aliases: ["insta", "aniig"],
    version: "1.3.1",
    author: "Arafat",
    countDown: 5,
    role: 0,
    description: "Anime edits from TikTok",
    category: "anime",
    guide: {
      en: "{pn} [anime name]"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ");
    if (!query) return message.reply(serifBold("𝐏𝐥𝐞𝐚𝐬𝐞 𝐩𝐫𝐨𝐯𝐢𝐝𝐞 𝐚𝐧 𝐚𝐧𝐢𝐦𝐞 𝐧𝐚𝐦𝐞! 🌸"));

    api.setMessageReaction("✨", event.messageID, () => {}, true);

    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
    const pathVideo = path.join(cacheDir, `anisr_${Date.now()}.mp4`);

    try {
      const searchTerms = `${query} anime edit amv no watermark`;
      
      // Added a 10-second timeout to prevent hanging
      const res = await axios.get(`https://www.tikwm.com/api/feed/search`, {
        params: { keywords: searchTerms },
        timeout: 10000 
      });

      const videos = res.data?.data?.videos;

      if (!videos || videos.length === 0) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(serifBold("❌ | 𝐍𝐨 𝐞𝐝𝐢𝐭𝐬 𝐯𝐢𝐝𝐞𝐨 𝐟𝐨𝐮𝐧𝐝 𝐛𝐚𝐛𝐲 <🥹"));
      }

      // Find a video not previously shown
      let selectedVideo = videos.find(v => !global.instaMemory.has(v.video_id));
      if (!selectedVideo) {
        global.instaMemory.clear(); 
        selectedVideo = videos[0];
      }
      global.instaMemory.add(selectedVideo.video_id);

      // Download with arraybuffer
      const videoResponse = await axios({
        method: 'get',
        url: selectedVideo.play,
        responseType: 'arraybuffer',
        timeout: 20000 // Videos can take longer to download
      });

      await fs.writeFile(pathVideo, Buffer.from(videoResponse.data));

      await message.reply({
        body: serifBold(`✨ | Here is your video baby\n━━━━━━━━━━━━━━━━━━`),
        attachment: fs.createReadStream(pathVideo)
      });

      api.setMessageReaction("🌸", event.messageID, () => {}, true);

    } catch (err) {
      console.error(err);
      api.setMessageReaction("⚠️", event.messageID, () => {}, true);
      return message.reply(serifBold("⚠️ 𝐒𝐞𝐫𝐯𝐞𝐫 𝐢𝐬 𝐛𝐮𝐬𝐲. 𝐓𝐫𝐲 𝐚𝐠𝐚𝐢𝐧 𝐢𝐧 𝐚 𝐦𝐨𝐦𝐞𝐧𝐭!"));
    } finally {
      // Clean up file regardless of success or failure
      if (fs.existsSync(pathVideo)) {
        setTimeout(() => fs.unlinkSync(pathVideo), 10000); // Delay cleanup to ensure upload finishes
      }
    }
  }
};

function serifBold(text) {
  const letters = {
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦',
    'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌',
    'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
  };
  return text.split('').map(char => letters[char] || char).join('');
}
