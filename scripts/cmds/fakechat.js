const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width > maxWidth && line !== "") {
      lines.push(line);
      line = word;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCircleImage(ctx, img, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

function drawFallbackAvatar(ctx, name, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  grad.addColorStop(0, "#4F8EF7");
  grad.addColorStop(1, "#8B5CF6");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${radius}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((name || "?").charAt(0).toUpperCase(), cx, cy + 2);
  ctx.restore();
}

async function fetchAvatar(uid) {
  const url = `https://graph.facebook.com/${uid}/picture?width=256&height=256&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 8000 });
  return loadImage(Buffer.from(res.data));
}

// ─────────────────────────────────────────────
//  CANVAS RENDERER
// ─────────────────────────────────────────────

async function buildFakeChatImage(avatarImg, displayName, messageText) {
  const WIDTH        = 620;
  const H_PAD        = 18;
  const V_PAD        = 16;
  const AVATAR_R     = 24;
  const AVATAR_D     = AVATAR_R * 2;
  const GAP          = 12;
  const BUBBLE_X     = H_PAD + AVATAR_D + GAP;
  const BUBBLE_MAX_W = WIDTH - BUBBLE_X - H_PAD;
  const NAME_FONT    = "bold 14px sans-serif";
  const MSG_FONT     = "15px sans-serif";
  const NAME_H       = 20;
  const LINE_H       = 22;
  const B_PAD_X      = 14;
  const B_PAD_Y      = 10;

  // Measure on scratch canvas
  const scratch = createCanvas(WIDTH, 100);
  const sCtx    = scratch.getContext("2d");

  sCtx.font = MSG_FONT;
  const lines = wrapText(sCtx, messageText, BUBBLE_MAX_W - B_PAD_X * 2);

  sCtx.font = NAME_FONT;
  const nameW = sCtx.measureText(displayName).width;

  sCtx.font = MSG_FONT;
  const maxLineW = Math.max(nameW, ...lines.map(l => sCtx.measureText(l).width));

  const BUBBLE_W = Math.min(BUBBLE_MAX_W, maxLineW + B_PAD_X * 2 + 4);
  const BUBBLE_H = B_PAD_Y + NAME_H + lines.length * LINE_H + B_PAD_Y;
  const HEIGHT   = Math.max(AVATAR_D + V_PAD * 2, BUBBLE_H + V_PAD * 2) + 20;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx    = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#121212";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Top divider
  ctx.fillStyle = "#2A2A2A";
  ctx.fillRect(0, 0, WIDTH, 1);

  // ── Avatar ──────────────────────────────────
  const avatarCX = H_PAD + AVATAR_R;
  const avatarCY = V_PAD + AVATAR_R;

  if (avatarImg) {
    drawCircleImage(ctx, avatarImg, avatarCX, avatarCY, AVATAR_R);
  } else {
    drawFallbackAvatar(ctx, displayName, avatarCX, avatarCY, AVATAR_R);
  }

  // Online dot border
  ctx.save();
  ctx.fillStyle = "#121212";
  ctx.beginPath();
  ctx.arc(avatarCX + AVATAR_R - 5, avatarCY + AVATAR_R - 5, 7, 0, Math.PI * 2);
  ctx.fill();
  // Online dot
  ctx.fillStyle = "#31A24C";
  ctx.beginPath();
  ctx.arc(avatarCX + AVATAR_R - 5, avatarCY + AVATAR_R - 5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Chat Bubble ──────────────────────────────
  const BUBBLE_Y = V_PAD;

  // Shadow
  ctx.save();
  ctx.shadowColor   = "rgba(0,0,0,0.45)";
  ctx.shadowBlur    = 12;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, BUBBLE_X, BUBBLE_Y, BUBBLE_W, BUBBLE_H, 18);
  ctx.fillStyle = "#2C2C2E";
  ctx.fill();
  ctx.restore();

  // Border
  roundRect(ctx, BUBBLE_X, BUBBLE_Y, BUBBLE_W, BUBBLE_H, 18);
  ctx.strokeStyle = "#3A3A3C";
  ctx.lineWidth   = 1;
  ctx.stroke();

  // ── Name ────────────────────────────────────
  ctx.font         = NAME_FONT;
  ctx.fillStyle    = "#4F8EF7";
  ctx.textAlign    = "left";
  ctx.textBaseline = "top";
  ctx.fillText(displayName, BUBBLE_X + B_PAD_X, BUBBLE_Y + B_PAD_Y);

  // ── Message Lines ─────────────────────────────
  ctx.font      = MSG_FONT;
  ctx.fillStyle = "#F2F2F7";

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(
      lines[i],
      BUBBLE_X + B_PAD_X,
      BUBBLE_Y + B_PAD_Y + NAME_H + i * LINE_H
    );
  }

  // ── Timestamp ────────────────────────────────
  const now     = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  ctx.font         = "11px sans-serif";
  ctx.fillStyle    = "#8E8E93";
  ctx.textAlign    = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(timeStr, BUBBLE_X + BUBBLE_W - B_PAD_X / 2, BUBBLE_Y + BUBBLE_H - 5);

  // ── Seen indicator ────────────────────────────
  ctx.font         = "11px sans-serif";
  ctx.fillStyle    = "#4F8EF7";
  ctx.textAlign    = "right";
  ctx.textBaseline = "top";
  ctx.fillText("Seen", BUBBLE_X + BUBBLE_W - B_PAD_X / 2, BUBBLE_Y + BUBBLE_H + 4);

  return canvas.toBuffer("image/png");
}

// ─────────────────────────────────────────────
//  GOATBOT COMMAND
// ─────────────────────────────────────────────

module.exports = {
  config: {
    name: "fakechat",
    aliases: ["fc", "fake", "ফেকচ্যাট"],
    version: "1.0",
    author: "MahMUD",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Generate a fake Messenger chat image" },
    longDescription: {
      en: "Generate a realistic fake Facebook Messenger chat message image for any user.",
      bn: "যেকোনো ইউজারের জন্য নকল মেসেঞ্জার চ্যাট ইমেজ তৈরি করুন।"
    },
    category: "fun",
    guide: {
      en: "  {pn} <@tag / reply / UID> <message text>",
      bn: "  {pn} <@ট্যাগ / রিপ্লাই / UID> <মেসেজ>"
    }
  },

  langs: {
    en: {
      noTarget: "❌ Please @mention someone, reply to a message, or provide a UID.",
      noText  : "❌ Please include the message text you want to fake.",
      success : "🗨️ Fake chat created for: %1",
      error   : "⚠️ Something went wrong: %1"
    },
    bn: {
      noTarget: "❌ কাউকে মেনশন করো, রিপ্লাই দাও, অথবা UID দাও।",
      noText  : "❌ কী মেসেজ দেখাতে চাও সেটা লিখো।",
      success : "🗨️ ফেক চ্যাট তৈরি হয়েছে: %1 এর জন্য",
      error   : "⚠️ সমস্যা হয়েছে: %1"
    }
  },

  onStart: async function ({ api, event, args, message, usersData, getLang }) {
    // ── Author guard ─────────────────────────────
    const expectedAuthor = String.fromCharCode(77, 97, 104, 77, 85, 68);
    if (this.config.author !== expectedAuthor) {
      return api.sendMessage(
        "You are not authorized to change the author name.",
        event.threadID,
        event.messageID
      );
    }

    try {
      const { mentions, messageReply } = event;
      let targetId  = null;
      let inputText = args.join(" ").trim();

      // ── Resolve target ────────────────────────
      if (messageReply) {
        targetId = messageReply.senderID;

      } else if (Object.keys(mentions).length > 0) {
        targetId  = Object.keys(mentions)[0];
        const mentionTag = mentions[targetId];
        inputText = inputText
          .replace(new RegExp(`@${mentionTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi"), "")
          .replace(/@\S+/g, "")
          .trim();

      } else if (args[0] && /^\d{5,}$/.test(args[0])) {
        targetId  = args[0];
        inputText = args.slice(1).join(" ").trim();
      }

      if (!targetId)  return message.reply(getLang("noTarget"));
      if (!inputText) return message.reply(getLang("noText"));

      // ── Resolve display name ──────────────────
      let displayName = "Unknown";
      try {
        displayName = (await usersData.getName(targetId)) || "Unknown";
      } catch {
        displayName = "Unknown";
      }

      // ── Fetch avatar ──────────────────────────
      let avatarImg = null;
      try {
        avatarImg = await fetchAvatar(targetId);
      } catch {
        avatarImg = null;
      }

      // ── Build image ───────────────────────────
      const imageBuffer = await buildFakeChatImage(avatarImg, displayName, inputText);

      // ── Save to cache ─────────────────────────
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const filePath = path.join(cacheDir, `fc_${Date.now()}.png`);
      fs.writeFileSync(filePath, imageBuffer);

      // ── Send ──────────────────────────────────
      await message.reply({
        body      : getLang("success", displayName),
        attachment: fs.createReadStream(filePath)
      });

      // ── Cleanup ───────────────────────────────
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    } catch (err) {
      console.error("[fakechat] Error:", err);
      return message.reply(getLang("error", err.message));
    }
  }
};
