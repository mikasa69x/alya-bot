const axios = require("axios");

module.exports = {
  config: {
    name: "imgur3",
    version: "3.0",
    author: "xalman",
    countDown: 3,
    role: 0,
    shortDescription: "Upload media to Imgur",
    category: "utility",
    guide: "{pn} [reply to any media]"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, type, messageReply } = event;
    const API_URL = "https://xalman-apis.vercel.app/api/imgur";

    if (type !== "message_reply" || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("╭─❍\n│ Please reply to a Photo, Video, or GIF!\n╰───────────⟡", threadID, messageID);
    }

    const attachment = messageReply.attachments[0];
    const mediaUrl = attachment.url;

    const waitMsg = await api.sendMessage("Uploading to Imgur...", threadID, messageID);

    try {
      const res = await axios.get(`${API_URL}?url=${encodeURIComponent(mediaUrl)}`);

      const imgurUrl = res.data.data?.url || res.data.url;

      if (imgurUrl) {
        return api.editMessage(imgurUrl, waitMsg.messageID);
      } else {
        throw new Error();
      }
    } catch (error) {
      return api.editMessage("✕ Failed to upload to Imgur!", waitMsg.messageID);
    }
  }
};
