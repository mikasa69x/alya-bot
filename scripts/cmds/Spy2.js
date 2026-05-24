const axios = require("axios");

module.exports = {
  config: {
    name: "spy2",
    aliases: ["userinfo2"],
    version: "1.7.5",
    role: 0,
    author: "SiFu",
    shortDescription: "Get user information with avatar & gender",
    longDescription: "Detailed user info with gender logic and high-quality images",
    category: "box chat",
    countDown: 5,
  },

  onStart: async function ({ event, message, usersData, api, args }) {
    try {
      const uid1 = event.senderID;
      const uid2 = Object.keys(event.mentions || {})[0];
      let uid;

      // 1️⃣ ID Selection Logic
      if (args[0] && /^\d+$/.test(args[0])) {
        uid = args[0];
      } else if (event.messageReply) {
        uid = event.messageReply.senderID;
      } else if (uid2) {
        uid = uid2;
      } else {
        uid = uid1;
      }

      // 2️⃣ Fetch Data
      const userInfo = await api.getUserInfo(uid);
      const data = userInfo[uid];

      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=${token}`;
      const avatarStream = (await axios.get(avatarUrl, { responseType: 'stream' })).data;

      // 🔹 Gender Logic Fixed
      // ফেসবুক এপিআই অনুযায়ী জেন্ডার চেক করার কয়েকটা উপায় এখানে দেওয়া হলো
      let genderText = "🌈 Other";
      const g = data.gender;

      if (g == 2 || g == "male" || g == "MALE") {
        genderText = "👦 Boy";
      } else if (g == 1 || g == "female" || g == "FEMALE") {
        genderText = "👧 Girl";
      }

      // Economy & Rank
      const userStats = await usersData.get(uid);
      const money = userStats ? userStats.money : 0;
      const allUser = await usersData.getAll();
      const rank = allUser.slice().sort((a, b) => b.exp - a.exp).findIndex(u => u.userID === uid) + 1;
      const moneyRank = allUser.slice().sort((a, b) => b.money - a.money).findIndex(u => u.userID === uid) + 1;

      // 3️⃣ Improved UI Design
      const userInformation = `
╭─『 𝐔𝐒𝐄𝐑 𝐈𝐍𝐅𝐎 』───⟡
│
│ 👤 𝐍𝐚𝐦𝐞: ${data.name}
│ ⚧  𝐆𝐞𝐧𝐝𝐞𝐫: ${genderText}
│ 🆔 𝐔𝐈𝐃: ${uid}
│ 🎓 𝐂𝐥𝐚𝐬𝐬: ${data.type ? data.type.toUpperCase() : "NORMAL USER"}
│ 🏵️ 𝐔𝐬𝐞𝐫𝐧𝐚𝐦𝐞: ${data.vanity || "None"}
│ 🎂 𝐁𝐢𝐫𝐭𝐡𝐝𝐚𝐲: ${data.isBirthday || "Private"}
│ 🗣️ 𝐍𝐢𝐜𝐤𝐧𝐚𝐦𝐞: ${data.alternateName || "None"}
│ 🤝 𝐅𝐫𝐢𝐞𝐧𝐝: ${data.isFriend ? "Yes" : "No"}
│
├─『 𝐄𝐂𝐎𝐍𝐎𝐌𝐘 』────⟡
│
│ 💰 𝐌𝐨𝐧𝐞𝐲: $${formatMoney(money)}
│ 🏆 𝐄𝐱𝐩 𝐑𝐚𝐧𝐤: #${rank}/${allUser.length}
│ 💸 𝐑𝐢𝐜𝐡 𝐑𝐚𝐧𝐤: #${moneyRank}/${allUser.length}
│
╰─────────────────⟡`;

      return message.reply({
        body: userInformation,
        attachment: avatarStream,
      });

    } catch (err) {
      console.error(err);
      return message.reply("❌ Error: Could not fetch user data. Please try again.");
    }
  },
};

function formatMoney(num) {
  const units = ["", "K", "M", "B", "T", "Q"];
  let unit = 0;
  while (num >= 1000 && ++unit < units.length) num /= 1000;
  return num.toFixed(1).replace(/\.0$/, "") + units[unit];
}
