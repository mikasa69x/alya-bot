const axios = require('axios');

module.exports = {
  config: {
    name: "uid2",
    version: "1.0.0",
    author: "SIFU",  // Team Heartless
    countDown: 5,
    role: 0,
    category: "info",
    shortDescription: { en: "Generate beautiful UID Card" },
    guide: { en: "Reply to someone or mention + .uid" }
  },

  onStart: async function ({ api, event, args, message }) {
    message.reaction("⏳🐸🤝🤦‍♀️", event.messageID);

    try {
      let targetID;

      // Priority: Reply > Mention > Self
      if (event.type === "message_reply") {
        targetID = event.messageReply.senderID;
      } 
      else if (Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      } 
      else {
        targetID = event.senderID;
      }

     
      const userInfo = await api.getUserInfo(targetID);
      const name = userInfo[targetID]?.name || "Unknown User";

      
      const avatarUrl = `https://graph.facebook.com/${targetID}/picture?type=large&width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      // Build API URL
      const apiUrl = `https://maybexenos.vercel.app/tools/uidcard?uid=${targetID}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatarUrl)}`;

      
      const res = await axios.get(apiUrl, { responseType: 'stream' });

      message.reaction("✅✅✅✅", event.messageID);

      
      return message.reply({
        body: `Name: ${name}\n\nUID: ${targetID}`,
        attachment: res.data
      });

    } catch (err) {
      console.error(err);
      message.reaction("❌", event.messageID);
      return message.reply("✧ Error generating UID Card. Try again later.");
    }
  }
};
