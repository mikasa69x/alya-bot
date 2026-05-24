const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "anya",
    author: "S1FU",
    version: "3.0",
    countDown: 5,
    role: 0,
    shortDescription: { en: "𝖺𝗇𝗒𝖺 𝖿𝗈𝗋𝗀𝖾𝗋 𝗍𝗍𝗌" },
    longDescription: { en: "𝖼𝗈𝗇𝗏𝖾𝗋𝗍 𝗍𝖾𝗑𝗍 𝗍𝗈 𝗌𝗉𝖾𝖾𝖼𝗁 𝗎𝗌𝗂𝗇𝗀 𝖺𝗇𝗒𝖺 𝖿𝗈𝗋𝗀𝖾𝗋'𝗌 𝗏𝗈𝗂𝖼𝖾" },
    category: "ai",
    guide: { en: "『 {pn} [𝗍𝖾𝗑𝗍] 』" }
  },

  onStart: async function ({ api, event, args }) {
    const { messageID, threadID, senderID } = event;

    try {
      if (!args[0]) {
        return api.sendMessage(
          `╭── Ი𐑼 𖹭 𝖺𝗇𝗒𝖺 𝗍𝗍𝗌 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝗉𝗅𝖾𝖺𝗌𝖾 𝗉𝗋𝗈𝗏𝗂𝖽𝖾 𝗍𝖾𝗑𝗍 .ᐟ\n  ⋆ 𝗎𝗌𝖾: {pn} 𝗐𝖺𝗄𝗎 𝗐𝖺𝗄𝗎\n\n╰── ᯓ★˙𐃷˙݁ ˖Ი𐑼⋆𖹭.ᐟ ──╯`,
          threadID, messageID
        );
      }

      const text = args.join(" ");
      api.setMessageReaction("🥵", messageID, () => {}, true);

      const apiUrl = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=3`;
      const response = await axios.get(apiUrl);

      if (!response.data.success) {
        throw new Error("𝖺𝗉𝗂 𝖿𝖺𝗂𝗅𝖾𝖽");
      }

      const audioUrl = response.data.mp3StreamingUrl;
      const cachePath = path.resolve(__dirname, 'cache');
      
      if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });
      const filePath = path.join(cachePath, `anya_${senderID}_${Date.now()}.mp3`);

      const getAudio = await axios.get(audioUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, Buffer.from(getAudio.data));

      const successMsg = `╭── Ი𐑼 𖹭 𝖺𝗇𝗒𝖺 𝗏𝗈𝗂𝖼𝖾 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝗆𝖾𝗌𝗌𝖺𝗀𝖾: "${text}"\n  ⋆ 𝗌𝖾𝗋𝗏𝖾𝖽 𝖻𝗒 𝗌𝟣𝖿𝗎 Ი𐑼\n\n╰── ᯓ★˙𐃷˙݁ ˖Ი𐑼⋆𖹭.ᐟ ──╯`;

      return api.sendMessage({
        body: successMsg,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        api.setMessageReaction("🎀", messageID, () => {}, true);
      }, messageID);

    } catch (error) {
      console.error(error);
      api.setMessageReaction("❌", messageID, () => {}, true);
      
      return api.sendMessage(
        `╭── Ი𐑼 𖹭 𝖾𝗋𝗋𝗈𝗋 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝗌𝗒𝗌𝗍𝖾𝗆 𝖿𝖺𝗂𝗅𝗎𝗋𝖾 .ᐟ\n\n╰── ᯓ★˙𐃷˙݁ ˖Ი𐑼⋆𖹭.ᐟ ──╯`,
        threadID, messageID
      );
    }
  }
};
