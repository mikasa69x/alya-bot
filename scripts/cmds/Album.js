"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_URL = process.env.ALBUM_API_URL || "https://album-api-hub-production.up.railway.app";
const TIMEOUT = 35000;
const TMP_DIR = path.join(process.cwd(), "database/cache/album");
fs.ensureDirSync(TMP_DIR);

function sc(str = "") {
  if (!str) return "";
  const map = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ1234567890";
  return String(str).toLowerCase().split('').map(c => {
    const i = c.charCodeAt(0) - 97;
    return (i >= 0 && i < 26) ? map[i] : c;
  }).join('');
}

function box(title, lines) {
  const body = Array.isArray(lines) ? lines.join("\n") : lines;
  return `「 ${sc(title)} 」\n\n${body}`;
}

const kv = (k, v) => `• ${sc(k)}: ${v}`;
const info = (msg) => `➤ ${sc(msg)}`;
const ok = (msg) => `✓ ${sc(msg)}`;
const warn = (msg) => `⚠ ${sc(msg)}`;
const fail = (title, msg) => `❌ ${sc(title)}\n${sc(msg)}`;

function formatBytes(b) {
  if (!b) return " ? ʙ";
  if (b < 1024) return `${b} ʙ`;
  if (b < 1 << 20) return `${(b / 1024).toFixed(1)} ᴋʙ`;
  return `${(b / (1 << 20)).toFixed(2)} ᴍʙ`;
}

function getMimeExt(mime = "", type = "") {
  const m = mime.split(";")[0].trim().toLowerCase();
  if (m.includes("video") || type === "video") return ".mp4";
  if (m === "video/quicktime") return ".mov";
  if (m === "video/webm") return ".webm";
  if (m.includes("audio") || type === "audio") return ".mp3";
  if (m.includes("gif")) return ".gif";
  if (m.includes("image") || type === "photo") return ".jpg";
  return ".bin";
}

function isTikTok(s = "") {
  return /tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com/i.test(s);
}

function cleanupLater(fp, ms = 90000) {
  setTimeout(() => fs.unlink(fp).catch(() => {}), ms);
}

async function apiGetCategories() {
  const { data } = await axios.get(`${API_URL}/api/categories`, { timeout: TIMEOUT });
  return data;
}

async function apiGetRandom(category, type = "video") {
  const { data } = await axios.get(`${API_URL}/api/categories/${category}/random`, { params: { type }, timeout: TIMEOUT });
  return data;
}

async function apiUpload({ category, filename, base64, mimetype }) {
  const { data } = await axios.post(`${API_URL}/api/album`, { category, filename, base64, mimetype }, { timeout: TIMEOUT });
  return data;
}

async function fetchTikTokData(url) {
  const res = await axios.get("https://www.tikwm.com/api/", { params: { url, hd: 1 }, timeout: 25000 });
  if (res.data?.code !== 0 || !res.data?.data) throw new Error(res.data?.msg || "tiktok api error");
  return res.data.data;
}

module.exports = {
  config: {
    name: "album",
    aliases: [],
    version: "1.1.1",
    author: "SIYAM",
    category: "media",
    shortDescription: { en: "Media album manager" },
    longDescription: { en: "Clean & improved album system" },
    guide: { en: "{pn} [list | <category> [img|mp3] | add <category> | info <category>]" },
    countDown: 5,
    role: 1,
  },

  onStart: async function ({ args, message, event, api }) {
    try { await message.react("⏳"); } catch(e){}

    const prefix = global.GoatBot?.config?.prefix || "/";
    const cmd = (args[0] || "").toLowerCase().trim();

    if (!cmd || cmd === "list") return cmdList(message.reply, prefix);
    if (cmd === "add") return cmdAdd(args, message, api, event, prefix);
    if (cmd === "info") return cmdInfo(args, message.reply, prefix);
    
    return cmdFetch(args, message, prefix, api);
  },
};

async function cmdList(send, prefix) {
  try {
    const cats = await apiGetCategories();
    if (!cats?.length) return send(warn("no categories found"));

    const lines = cats.map(c => `📁 ${sc(c.label)} 🎬${c.videoCount} 🖼️${c.imageCount} 🎵${c.audioCount}`);
    const help = [sc("available commands:"), `${prefix}album cosplay`, `${prefix}album cosplay img`, `${prefix}album add cosplay`].join("\n");

    return send(box("album categories", [...lines, "", help]));
  } catch (e) {
    return send(fail("list error", e.message));
  }
}

async function cmdInfo(args, send, prefix) {
  const category = (args[1] || "").toLowerCase().trim();
  if (!category) return send(warn(`usage: ${prefix}album info <category>`));

  try {
    const cats = await apiGetCategories();
    const cat = cats.find(c => c.label?.toLowerCase() === category);
    if (!cat) return send(fail("not found", `"${category}" doesn't exist`));

    const lines = [
      kv("videos", cat.videoCount),
      kv("images", cat.imageCount),
      kv("audio", cat.audioCount),
      kv("total", cat.videoCount + cat.imageCount + cat.audioCount),
    ];
    return send(box(`${category} info`, lines));
  } catch (e) {
    return send(fail("info error", e.message));
  }
}

async function cmdFetch(args, message, prefix, api) {
  const category = args[0].replace(/\s+/g, "_").toLowerCase();
  const modeArg = (args[1] || "").toLowerCase();
  const mediaType = ["img", "image"].includes(modeArg) ? "image" : ["mp3", "audio"].includes(modeArg) ? "audio" : "video";

  const typeEmoji = { video: "🎬", image: "🖼️", audio: "🎵" }[mediaType];
  const waitMsg = await message.reply(`⏳ ${sc(`fetching ${mediaType} from ${category}...`)}`);

  try {
    const item = await apiGetRandom(category, mediaType);
    if (!item?.url) throw new Error("no media found in this category");

    const fileUrl = item.githubUrl || `${API_URL}${item.url}`;
    const ext = path.extname(item.name) || getMimeExt("", mediaType);
    const tmpPath = path.join(TMP_DIR, `alb_${Date.now()}${ext}`);

    const dl = await axios.get(fileUrl, { responseType: "stream", timeout: TIMEOUT });
    const wt = fs.createWriteStream(tmpPath);
    await new Promise((res, rej) => {
      dl.data.pipe(wt);
      wt.on("finish", res);
      wt.on("error", rej);
    });

    const stat = fs.statSync(tmpPath);

    const caption = [
      kv("category", sc(item.category || category)),
      kv("title", item.title || item.name || "untitled"),
      kv("type", mediaType),
      kv("size", formatBytes(stat.size)),
    ].join("\n");

    await message.reply({
      body: box(`${typeEmoji} album media`, caption),
      attachment: fs.createReadStream(tmpPath)
    });

    cleanupLater(tmpPath);
  } catch (e) {
    await message.reply(fail("fetch failed", e.message));
  } finally {
    if (waitMsg?.messageID) await api.unsendMessage(waitMsg.messageID).catch(() => {});
  }
}

async function cmdAdd(args, message, api, event, prefix) {
  const category = (args[1] || "").toLowerCase().trim();
  if (!category) {
    return message.reply(box("upload guide", [
      info("reply to any video / photo / audio"),
      `${prefix}album add <category>`,
      info("or use +name for custom filename"),
      `${prefix}album add cosplay +myvideo`
    ]));
  }

  const waitMsg = await message.reply(`⏳ ${sc(`uploading to ${category}...`)}`);

  try {
    
    const tikArg = args.slice(2).find(isTikTok);
    if (tikArg) {
      const tk = await fetchTikTokData(tikArg);
      const vidUrl = tk.hdplay || tk.play;
      if (!vidUrl) throw new Error("no video url from tiktok");

      const nameParts = args.slice(2).filter(a => !isTikTok(a)).join(" ");
      const customBase = (nameParts.startsWith("+") ? nameParts.slice(1) : nameParts).replace(/\.[^.]+$/, "").trim() || `tiktok_${Date.now()}`;
      const filename = customBase + ".mp4";

      const dl = await axios.get(vidUrl, { responseType: "arraybuffer", timeout: 60000, maxContentLength: 100 * 1024 * 1024 });
      const buffer = Buffer.from(dl.data);

      const result = await apiUpload({ category, filename, base64: buffer.toString("base64"), mimetype: "video/mp4" });
      if (!result.success) throw new Error(result.error || "upload failed");

      return message.reply(ok(`tiktok video successfully added to ${sc(category)}`));
    }

    const msgReply = event?.messageReply;
    const attach = msgReply?.attachments?.[0];
    if (!msgReply || !attach) {
      return message.reply(warn("please reply to a video, photo or audio file"));
    }

    const dlUrl = attach.url || attach.playbackUrl || attach.videoUrl || attach.imageUrl || attach.previewUrl;
    if (!dlUrl) throw new Error("could not get media url");

    const namePart = args.slice(2).join(" ");
    const customBase = (namePart.startsWith("+") ? namePart.slice(1) : namePart).replace(/\.[^.]+$/, "").trim() || `album_${Date.now()}`;
    const mime = attach.mimeType || "application/octet-stream";
    const ext = getMimeExt(mime, attach.type || "");
    const filename = customBase + ext;

    const dl = await axios.get(dlUrl, { responseType: "arraybuffer", timeout: TIMEOUT });
    const buffer = Buffer.from(dl.data);

    const result = await apiUpload({ category, filename, base64: buffer.toString("base64"), mimetype: mime });
    if (!result.success) throw new Error(result.error || "upload failed");

    return message.reply(ok(`media successfully added to ${sc(category)}`));

  } catch (e) {
    return message.reply(fail("upload failed", e.message));
  } finally {
    if (waitMsg?.messageID) await api.unsendMessage(waitMsg.messageID).catch(() => {});
  }
}
