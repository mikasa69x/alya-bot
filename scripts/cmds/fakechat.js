const axios = require("axios");
const fs = require("fs");
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
  grad.addColorStop(0, "#FF6B9D");
  grad.addColorStop(1, "#FF1744");
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
//  DRAW FLOATING HEARTS (background deco)
// ─────────────────────────────────────────────

function drawHeart(ctx, x, y, size, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + size / 4);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
  ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size);
  ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
  ctx.fill();
  ctx.restore();
}

function drawBackgroundHearts(ctx, width, height) {
  // Fixed decorative hearts scattered in background
  const hearts = [
    { x: 30,  y: 10,  size: 10, color: "#FF6B9D", alpha: 0.25 },
    { x: 120, y: 5,   size: 7,  color: "#FF1744", alpha: 0.18 },
    { x: 200, y: 15,  size: 12, color: "#FF6B9D", alpha: 0.20 },
    { x: 310, y: 8,   size: 8,  color: "#FFB3C6", alpha: 0.22 },
    { x: 420, y: 12,  size: 10, color: "#FF1744", alpha: 0.15 },
    { x: 510, y: 6,   size: 7,  color: "#FF6B9D", alpha: 0.20 },
    { x: 570, y: 18,  size: 9,  color: "#FFB3C6", alpha: 0.18 },
    { x: 60,  y: height - 20, size: 8,  color: "#FF6B9D", alpha: 0.18 },
    { x: 150, y: height - 15, size: 10, color: "#FF1744", alpha: 0.15 },
    { x: 280, y: height - 18, size: 7,  color: "#FFB3C6", alpha: 0.20 },
    { x: 400, y: height - 12, size: 9,  color: "#FF6B9D", alpha: 0.18 },
    { x: 530, y: height - 20, size: 8,  color: "#FF1744", alpha: 0.15 },
  ];
  for (const h of hearts) {
    drawHeart(ctx, h.x, h.y, h.size, h.color, h.alpha);
  }
}

// ─────────────────────────────────────────────
//  LOVE REACTION BADGE
// ─────────────────────────────────────────────

function drawLoveReaction(ctx, x, y) {
  // Small heart reaction badge at bottom of bubble
  const SIZE = 18;
  ctx.save();
  // Badge circle bg
  ctx.beginPath();
  ctx.arc(x, y, SIZE / 2 + 3, 0, Math.PI * 2);
  ctx.fillStyle = "#1A0A10";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, SIZE / 2 + 2, 0, Math.PI * 2);
  ctx.fillStyle = "#FF1744";
  ctx.fill();
  // Heart inside
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `${SIZE - 6}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("❤️", x, y + 1);
  ctx.restore();
}

// ─────────────────────────────────────────────
//  CANVAS RENDERER — LOVE THEME
// ─────────────────────────────────────────────

async function buildFakeChatImage(avatarImg, displayName, messageText) {
  const WIDTH        = 620;
  const H_PAD        = 18;
  const V_PAD        = 20;
  const AVATAR_R     = 26;
  const AVATAR_D     = AVATAR_R * 2;
  const GAP          = 12;
  const BUBBLE_X     = H_PAD + AVATAR_D + GAP;
  const BUBBLE_MAX_W = WIDTH - BUBBLE_X - H_PAD;
  const NAME_FONT    = "bold 14px sans-serif";
  const MSG_FONT     = "15px sans-serif";
  const NAME_H       = 20;
  const LINE_H       = 23;
  const B_PAD_X      = 16;
  const B_PAD_Y      = 12;
  const REACTION_H   = 20; // extra space below bubble for reaction badge

  // Measure text
  const scratch = createCanvas(WIDTH, 100);
  const sCtx    = scratch.getContext("2d");

  sCtx.font = MSG_FONT;
  const lines = wrapText(sCtx, messageText, BUBBLE_MAX_W - B_PAD_X * 2);

  sCtx.font = NAME_FONT;
  const nameW = sCtx.measureText(displayName).width;

  sCtx.font = MSG_FONT;
  const maxLineW = Math.max(nameW, ...lines.map(l => sCtx.measureText(l).width));

  const BUBBLE_W = Math.min(BUBBLE_MAX_W, maxLineW + B_PAD_X * 2 + 6);
  const BUBBLE_H = B_PAD_Y + NAME_H + lines.length * LINE_H + B_PAD_Y;
  const HEIGHT   = Math.max(AVATAR_D + V_PAD * 2, BUBBLE_H + V_PAD * 2) + REACTION_H + 16;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx    = canvas.getContext("2d");

  // ── Background: deep romantic dark gradient ──
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGrad.addColorStop(0,   "#1A0008");
  bgGrad.addColorStop(0.5, "#2D0018");
  bgGrad.addColorStop(1,   "#1A000F");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle pink vignette overlay
  const vigGrad = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, WIDTH * 0.8);
  vigGrad.addColorStop(0,   "rgba(255,107,157,0)");
  vigGrad.addColorStop(1,   "rgba(180,0,50,0.18)");
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Decorative hearts in background
  drawBackgroundHearts(ctx, WIDTH, HEIGHT);

  // ── Top glowing line ────────────────────────
  const lineGrad = ctx.createLinearGradient(0, 0, WIDTH, 0);
  lineGrad.addColorStop(0,   "rgba(255,23,68,0)");
  lineGrad.addColorStop(0.5, "rgba(255,23,68,0.7)");
  lineGrad.addColorStop(1,   "rgba(255,23,68,0)");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, 0, WIDTH, 2);

  // ── Avatar ───────────────────────────────────
  const avatarCX = H_PAD + AVATAR_R;
  const avatarCY = V_PAD + AVATAR_R;

  // Avatar glow ring (love pink)
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, AVATAR_R + 4, 0, Math.PI * 2);
  const ringGrad = ctx.createRadialGradient(avatarCX, avatarCY, AVATAR_R, avatarCX, avatarCY, AVATAR_R + 4);
  ringGrad.addColorStop(0, "rgba(255,23,68,0.6)");
  ringGrad.addColorStop(1, "rgba(255,23,68,0)");
  ctx.fillStyle = ringGrad;
  ctx.fill();
  ctx.restore();

  if (avatarImg) {
    drawCircleImage(ctx, avatarImg, avatarCX, avatarCY, AVATAR_R);
  } else {
    drawFallbackAvatar(ctx, displayName, avatarCX, avatarCY, AVATAR_R);
  }

  // Online dot (love red)
  ctx.save();
  ctx.fillStyle = "#1A0008";
  ctx.beginPath();
  ctx.arc(avatarCX + AVATAR_R - 5, avatarCY + AVATAR_R - 5, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FF1744";
  ctx.beginPath();
  ctx.arc(avatarCX + AVATAR_R - 5, avatarCY + AVATAR_R - 5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Chat Bubble ──────────────────────────────
  const BUBBLE_Y = V_PAD;

  // Bubble glow behind
  ctx.save();
  ctx.shadowColor   = "rgba(255,23,68,0.35)";
  ctx.shadowBlur    = 20;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, BUBBLE_X, BUBBLE_Y, BUBBLE_W, BUBBLE_H, 20);
  // Bubble gradient fill
  const bubbleGrad = ctx.createLinearGradient(BUBBLE_X, BUBBLE_Y, BUBBLE_X + BUBBLE_W, BUBBLE_Y + BUBBLE_H);
  bubbleGrad.addColorStop(0, "#3D0020");
  bubbleGrad.addColorStop(1, "#2A0016");
  ctx.fillStyle = bubbleGrad;
  ctx.fill();
  ctx.restore();

  // Bubble border — glowing pink stroke
  roundRect(ctx, BUBBLE_X, BUBBLE_Y, BUBBLE_W, BUBBLE_H, 20);
  const borderGrad = ctx.createLinearGradient(BUBBLE_X, BUBBLE_Y, BUBBLE_X + BUBBLE_W, BUBBLE_Y + BUBBLE_H);
  borderGrad.addColorStop(0, "rgba(255,107,157,0.7)");
  borderGrad.addColorStop(1, "rgba(255,23,68,0.4)");
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // ── Name ─────────────────────────────────────
  ctx.font         = NAME_FONT;
  ctx.fillStyle    = "#FF6B9D";
  ctx.textAlign    = "left";
  ctx.textBaseline = "top";
  ctx.fillText(displayName, BUBBLE_X + B_PAD_X, BUBBLE_Y + B_PAD_Y);

  // ── Message Lines ─────────────────────────────
  ctx.font      = MSG_FONT;
  ctx.fillStyle = "#FFE4ED";

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
  ctx.fillStyle    = "#FF6B9D";
  ctx.textAlign    = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(timeStr, BUBBLE_X + BUBBLE_W - B_PAD_X / 2, BUBBLE_Y + BUBBLE_H - 5);

  // ── Seen ──────────────────────────────────────
  ctx.font         = "11px sans-serif";
  ctx.fillStyle    = "#FF6B9D";
  ctx.textAlign    = "right";
  ctx.textBaseline = "top";
  ctx.fillText("Seen ❤️", BUBBLE_X + BUBBLE_W - B_PAD_X / 2, BUBBLE_Y + BUBBLE_H + 5);

  // ── Love Reaction Badge ───────────────────────
  drawLoveReaction(ctx, BUBBLE_X + 24, BUBBLE_Y + BUBBLE_H - 4);

  // ── Bottom glow line ──────────────────────────
  const bottomGrad = ctx.createLinearGradient(0, HEIGHT - 2, WIDTH, HEIGHT - 2);
  bottomGrad.addColorStop(0,   "rgba(255,23,68,0)");
  bottomGrad.addColorStop(0.5, "rgba(255,23,68,0.5)");
  bottomGrad.addColorStop(1,   "rgba(255,23,68,0)");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, HEIGHT - 2, WIDTH, 2);

  return canvas.toBuffer("image/png");
}

// ─────────────────────────────────────────────
//  GOATBOT COMMAND
// ─────────────────────────────────────────────

module.exports = {
  config: {
    name: "fakechat",
    aliases: ["fc", "fake", "ফেকচ্যাট"],
    version: "2.0",
    author: "MahMUD",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Generate a fake Messenger chat with Love theme" },
    longDescription: {
      en: "Generate a realistic fake Facebook Messenger chat with a romantic Love theme.",
      bn: "রোমান্টিক Love থিমে নকল মেসেঞ্জার চ্যাট ইমেজ তৈরি করুন।"
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
      success : "💕 Love chat created for: %1",
      error   : "⚠️ Something went wrong: %1"
    },
    bn: {
      noTarget: "❌ কাউকে মেনশন করো, রিপ্লাই দাও, অথবা UID দাও।",
      noText  : "❌ কী মেসেজ দেখাতে চাও সেটা লিখো।",
      success : "💕 লাভ চ্যাট তৈরি হয়েছে: %1 এর জন্য",
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
