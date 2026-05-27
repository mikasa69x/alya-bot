const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "latti",
    aliases: ["lathi", "kick1"],
    version: "2.0",
    author: "eden",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Manga punch/kick edit" },
    longDescription: { en: "Adds your profile pic and target's profile pic into a manga fight scene" },
    category: "fun",
    guide: {
      en: "{pn} @mention / reply"
    }
  },

  onStart: async function ({ api, event, message }) {
    try {
      // ── Resolve target ────────────────────────────────────────────────────────
      let targetID = null;

      if (Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      } else if (event.messageReply) {
        targetID = event.messageReply.senderID;
      } else {
        return message.reply("❌ কাকে কিক মারবি? মেনশন দে অথবা রিপ্লাই করে কমান্ড দে!");
      }

      const senderID = event.senderID;

      // ── Setup cache dir ───────────────────────────────────────────────────────
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      // ── Load template image ───────────────────────────────────────────────────
      const templatePath = path.join(cacheDir, "Messenger_creation_2083195032261215.jpeg");
      if (!fs.existsSync(templatePath)) {
        return message.reply("❌ Template image not found!\nPlease put 'Messenger_creation_2083195032261215.jpeg' inside the cache folder.");
      }

      const baseImg = await loadImage(templatePath);

      // ── Fetch both avatars in parallel ────────────────────────────────────────
      const avatarUrl = (uid) =>
        `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const [senderRes, targetRes] = await Promise.all([
        axios.get(avatarUrl(senderID), { responseType: "arraybuffer", timeout: 8000 }),
        axios.get(avatarUrl(targetID), { responseType: "arraybuffer", timeout: 8000 })
      ]);

      const senderImg = await loadImage(Buffer.from(senderRes.data));
      const targetImg = await loadImage(Buffer.from(targetRes.data));

      // ── Canvas ────────────────────────────────────────────────────────────────
      // Template size: 1220 x 1560
      // Layout:
      //   - RIGHT side (puncher/sender): top-right  ~ cx=910, cy=125
      //   - LEFT side  (hit guy/target): top-left   ~ cx=265, cy=190
      const W = baseImg.width;
      const H = baseImg.height;

      const canvas = createCanvas(W, H);
      const ctx    = canvas.getContext("2d");

      ctx.drawImage(baseImg, 0, 0, W, H);

      // ── Helper: circular avatar with soft ring ────────────────────────────────
      const drawAvatar = (img, cx, cy, radius) => {
        ctx.save();

        // Soft white glow ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.20)";
        ctx.fill();

        // Clip & draw avatar
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
        ctx.restore();
      };

      // ── Sender (puncher) — right side top ────────────────────────────────────
      drawAvatar(senderImg, 910, 125, 88);

      // ── Target (hit guy) — left side top ─────────────────────────────────────
      drawAvatar(targetImg, 265, 190, 100);

      // ── Save & send ───────────────────────────────────────────────────────────
      const outPath = path.join(cacheDir, `latti_out_${Date.now()}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer("image/png"));

      await message.reply({
        body      : "আহা রে 😂🦵💥 মাইরালা!",
        attachment: fs.createReadStream(outPath)
      });

      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

    } catch (err) {
      console.error("[latti] Error:", err);
      return message.reply(`❌ Error: ${err.message}`);
    }
  }
};
