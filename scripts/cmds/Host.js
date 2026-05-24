const axios = require('axios');
const path  = require('path');

const API     = process.env.ALBUM_API_URL || 'https://album-api-hub-production.up.railway.app';
const TIMEOUT = 60000;

/* ── Extract any downloadable URL from attachment ── */
function extractUrl(attach) {
  if (!attach) return null;

  const known = [
    attach.url, attach.playbackUrl, attach.videoUrl,
    attach.audioUrl, attach.imageUrl, attach.largePreviewUrl,
    attach.previewUrl, attach.thumbnailUrl,
    attach.link, attach.uri, attach.src,
    attach.sdUrl, attach.hdUrl, attach.streamUrl, attach.fbUrl,
    attach.share?.link, attach.share?.url,
    attach.share?.playbackUrl, attach.share?.previewUrl,
  ];
  for (const u of known) {
    if (typeof u === 'string' && u.startsWith('http')) return u;
  }

  function deepSearch(obj, depth) {
    if (depth > 5 || !obj || typeof obj !== 'object') return null;
    const vals = Object.values(obj);
    for (const v of vals) {
      if (typeof v === 'string' && v.startsWith('http') &&
          /fbcdn|\.mp4|\.mp3|\.jpg|\.png|video|audio|media/i.test(v))
        return v;
    }
    for (const v of vals) {
      if (typeof v === 'string' && v.startsWith('http') && v.length > 20)
        return v;
      if (v && typeof v === 'object') {
        const found = deepSearch(v, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }
  return deepSearch(attach, 0);
}

/* ── mime + attachType → extension ── */
function guessExt(mime, attachType, urlStr) {
  const m = (mime || '').split(';')[0].trim().toLowerCase();
  const extMap = {
    'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov',
    'video/x-matroska':'mkv','video/mpeg':'mp4','video/3gpp':'mp4',
    'image/jpeg':'jpg','image/png':'png','image/gif':'gif',
    'image/webp':'webp','image/svg+xml':'svg',
    'audio/mpeg':'mp3','audio/mp4':'m4a','audio/ogg':'ogg',
    'audio/wav':'wav','audio/flac':'flac','audio/aac':'aac',
  };
  if (attachType === 'audio') return 'mp3';
  if (attachType === 'photo') return 'jpg';
  if (extMap[m]) return extMap[m];
  if (m.startsWith('video') || attachType === 'video') return 'mp4';
  if (m.startsWith('audio')) return 'mp3';
  if (m.startsWith('image')) return 'jpg';
  if (urlStr) {
    try {
      const ext = path.extname(new URL(urlStr).pathname).slice(1).toLowerCase();
      if (ext && ext.length <= 5) return ext;
    } catch (_) {}
  }
  return 'bin';
}

function fmtB(b) {
  if (!b || b === 0) return '0 B';
  const i = Math.floor(Math.log(Math.max(b, 1)) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + ['B','KB','MB','GB'][i];
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Download buffer from URL ── */
async function downloadBuf(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: TIMEOUT,
    maxContentLength: 200 * 1024 * 1024,
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept':          '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer':         'https://www.facebook.com/',
      'Origin':          'https://www.facebook.com',
      'Sec-Fetch-Dest':  'video',
      'Sec-Fetch-Mode':  'no-cors',
      'Sec-Fetch-Site':  'cross-site',
    },
  });
  return {
    buf:  Buffer.from(res.data),
    mime: res.headers['content-type'] || 'application/octet-stream',
  };
}

/* ── Upload buffer to host API ── */
async function uploadBuf(buf, filename, mimeType) {
  const { data } = await axios.post(`${API}/api/host/base64`, {
    filename,
    base64: buf.toString('base64'),
    mimeType,
  }, { timeout: TIMEOUT });
  if (!data.success) throw new Error(data.error || 'Upload failed');
  return data.file;
}

/* ── Resolve video URL via bot Facebook session ── */
async function resolveViaApi(api, attach) {
  const videoID = String(attach.ID || attach.id || '').trim();
  if (!videoID || videoID === '0') return null;

  function httpGet(url, form) {
    return new Promise((resolve, reject) => {
      if (typeof api.httpGet !== 'function') return reject(new Error('no httpGet'));
      api.httpGet(url, form || {}, (err, body) => err ? reject(err) : resolve(body || ''));
    });
  }

  function extractFromBody(body) {
    if (typeof body !== 'string') return null;
    const patterns = [
      /"playable_url_quality_hd":"([^"]+)"/,
      /"playable_url":"([^"]+)"/,
      /sd_src\s*:\s*"([^"]+)"/,
      /hd_src\s*:\s*"([^"]+)"/,
      /"src":"(https:[^"]*fbcdn[^"]*\.mp4[^"]*)"/,
      /https:\/\/[^\s"'<>]*fbcdn[^\s"'<>]*\.mp4[^\s"'<>]*/,
    ];
    for (const p of patterns) {
      const m = body.match(p);
      if (m) return (m[1] || m[0])
        .replace(/\\u0025/g, '%')
        .replace(/\\\//g, '/')
        .replace(/\\/g, '');
    }
    return null;
  }

  try {
    const body = await httpGet('https://www.facebook.com/video/embed/', { video_id: videoID });
    const url = extractFromBody(body);
    if (url) return url;
  } catch (_) {}

  try {
    const body = await httpGet('https://www.facebook.com/messages/attachment/download/', { attach_id: videoID });
    const url = extractFromBody(body);
    if (url) return url;
  } catch (_) {}

  return null;
}

/* ── Success message ── */
function successMsg(file, note) {
  return (
    `✅ 𝗨𝗣𝗟𝗢𝗔𝗗 𝗦𝗨𝗖𝗖𝗘𝗦𝗦\n` +
    `┌ Link : ${file.url}\n` +
    `├ Name : ${file.originalName}\n` +
    `├ Size : ${fmtB(file.size)}\n` +
    `├ ID   : ${file.id}\n` +
    `└ ${note || '💡 Share this link with anyone!'}`
  );
}

/* ════════════════════════════════════════
   GoatBot v2 — module.exports
════════════════════════════════════════ */
module.exports = {
  config: {
    name:             'host',
    aliases:          ['upload', 'filehost'],
    version:          '4.1.0',
    author:           'SIFU',
    role:             0,
    countDown:        5,
    category:         'media',
    shortDescription: 'Upload any file and get a permanent shareable link',
    longDescription:  'Reply to any media (video, image, audio, GIF) or provide a URL to get a permanent shareable link.',
    guide:            '{pn}host | {pn}host url <link> | {pn}host list | {pn}host del <id> | {pn}host info <id>',
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, messageReply } = event;
    const sub = (args[0] || '').toLowerCase();

    /* ── host debug ── */
    if (sub === 'debug') {
      if (!messageReply?.attachments?.length)
        return message.reply('❌ Reply to a media message first, then use: host debug');

      const attach = messageReply.attachments[0];
      const info = {};
      for (const k of Object.keys(attach)) {
        const v = attach[k];
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
          info[k] = typeof v === 'string' && v.length > 80 ? v.slice(0, 80) + '…' : v;
        else if (v && typeof v === 'object')
          info[k] = JSON.stringify(v).slice(0, 100);
      }
      const url = extractUrl(attach);
      return message.reply(
        `🔍 HOST DEBUG\nAPI: ${API}\nType: ${attach.type || 'unknown'}\nURL found: ${url ? '✅ ' + url.slice(0, 60) + '…' : '❌'}\n\n` +
        Object.entries(info).map(([k, v]) => `${k}: ${v}`).join('\n')
      );
    }

    /* ── host list ── */
    if (sub === 'list') {
      try {
        const { data } = await axios.get(`${API}/api/host/list?limit=10`, { timeout: 15000 });
        if (!data.files?.length)
          return message.reply('📭 No hosted files yet.\nReply to any media and type "host" to upload.');

        const lines = data.files.map((f, i) => {
          const type = (f.mimeType || '').split('/')[0];
          const icon = type === 'video' ? '🎬' : type === 'audio' ? '🎵' : type === 'image' ? '🖼' : '📄';
          return (
            `${i + 1}. ${icon} ${f.originalName}\n` +
            `   🆔 ${f.id}  📦 ${fmtB(f.size)}  🕐 ${timeAgo(f.uploadedAt)}\n` +
            `   🔗 ${f.url}`
          );
        }).join('\n\n');

        return message.reply(
          `╔══ 🗂 𝗛𝗢𝗦𝗧𝗘𝗗 𝗙𝗜𝗟𝗘𝗦 ══╗\n` +
          `  Total: ${data.total} files · ${fmtB(data.totalSize)}\n\n` +
          `${lines}\n\n` +
          `╚══════════════════════╝\n` +
          `📌 host del <id>  →  delete`
        );
      } catch (e) {
        return message.reply(`❌ Failed to load list: ${e.message}`);
      }
    }

    /* ── host del <id> ── */
    if (sub === 'del' || sub === 'delete') {
      const id = args[1];
      if (!id) return message.reply('❌ Usage: host del <id>');
      try {
        const { data } = await axios.delete(`${API}/api/host/${id}`, { timeout: 10000 });
        return message.reply(
          `🗑 𝗗𝗲𝗹𝗲𝘁𝗲𝗱!\n` +
          `┌ ID   : ${id}\n` +
          `└ File : ${data.file?.originalName || '?'}`
        );
      } catch (e) {
        return message.reply(`❌ Delete failed: ${e.response?.data?.error || e.message}`);
      }
    }

    /* ── host info <id> ── */
    if (sub === 'info') {
      const id = args[1];
      if (!id) return message.reply('❌ Usage: host info <id>');
      try {
        const { data } = await axios.get(`${API}/api/host/info/${id}`, { timeout: 10000 });
        if (!data.file) return message.reply(`❌ File [${id}] not found.`);
        const f = data.file;
        const type = (f.mimeType || '').split('/')[0];
        const icon = type === 'video' ? '🎬' : type === 'audio' ? '🎵' : type === 'image' ? '🖼' : '📄';
        return message.reply(
          `${icon} 𝗙𝗜𝗟𝗘 𝗜𝗡𝗙𝗢\n` +
          `┌ ID      : ${f.id}\n` +
          `├ Name    : ${f.originalName}\n` +
          `├ Size    : ${fmtB(f.size)}\n` +
          `├ Type    : ${f.mimeType || 'unknown'}\n` +
          `├ Upload  : ${timeAgo(f.uploadedAt)}\n` +
          `└ Link    : ${f.url}`
        );
      } catch (e) {
        return message.reply(`❌ ${e.response?.data?.error || e.message}`);
      }
    }

    /* ── host url <url> ── */
    if (sub === 'url') {
      const dlUrl = args[1];
      if (!dlUrl || !dlUrl.startsWith('http'))
        return message.reply(
          '❌ Usage: host url <direct-url>\n' +
          'Example: host url https://example.com/video.mp4'
        );
      try {
        await message.reply('⏳ Downloading & uploading…');
        const { buf, mime } = await downloadBuf(dlUrl);
        const ext      = guessExt(mime, null, dlUrl);
        const filename = `host_url_${Date.now()}.${ext}`;
        const file     = await uploadBuf(buf, filename, mime);
        return message.reply(successMsg(file, '🌐 Uploaded from URL'));
      } catch (e) {
        return message.reply(`❌ URL upload failed: ${e.response?.data?.error || e.message}`);
      }
    }

    /* ── no reply → show help ── */
    const hasReply = messageReply?.attachments?.length > 0;
    if (!hasReply) {
      return message.reply(
        `📎 𝗛𝗢𝗦𝗧 𝗖𝗢𝗠𝗠𝗔𝗡𝗗\n` +
        `══════════════════\n` +
        `Reply to any media and type:\n` +
        `  host\n\n` +
        `Supports: 🎬 Video · 🖼 Image\n` +
        `          🎵 Audio · 🎞 GIF · 📄 File\n\n` +
        `📌 Other commands:\n` +
        `  host url <link>   → upload from URL\n` +
        `  host list         → recent uploads\n` +
        `  host del <id>     → delete file\n` +
        `  host info <id>    → file details\n` +
        `  host debug        → debug attachment`
      );
    }

    /* ── host (reply to media) ── */
    const attach     = messageReply.attachments[0];
    const attachType = attach.type || '';
    let   dlUrl      = extractUrl(attach);

    if (!dlUrl) dlUrl = await resolveViaApi(api, attach);

    if (!dlUrl) {
      return message.reply(
        `❌ 𝗖𝗔𝗡𝗡𝗢𝗧 𝗥𝗘𝗔𝗗 𝗔𝗧𝗧𝗔𝗖𝗛𝗠𝗘𝗡𝗧\n` +
        `Type: ${attachType || 'unknown'}\n` +
        `ID: ${attach.ID || attach.id || 'none'}\n\n` +
        `📌 Solutions:\n` +
        `• Forward/save the media to yourself first\n` +
        `• Reply to YOUR OWN saved copy\n` +
        `• Use: host url <direct-link>\n` +
        `• Use: host debug (reply to media)\n` +
        `⚠️ Facebook Stories & Reels have no downloadable URL`
      );
    }

    try {
      const typeIcon = attachType === 'video' ? '🎬' : attachType === 'audio' ? '🎵' : attachType === 'photo' ? '🖼' : '📄';
      await message.reply(`${typeIcon} Uploading ${attachType || 'file'}… Please wait.`);

      const { buf, mime } = await downloadBuf(dlUrl);
      const ext      = guessExt(mime, attachType, dlUrl);
      const filename = `sifu_host_${Date.now()}.${ext}`;
      const file     = await uploadBuf(buf, filename, mime);

      return message.reply(successMsg(file, '📤 Uploaded from reply'));
    } catch (e) {
      if (e.response?.status === 403)
        return message.reply(
          `❌ Download blocked (403 Forbidden).\n` +
          `Facebook is blocking the direct download.\n\n` +
          `📌 Fix:\n` +
          `• Forward/save the video to yourself\n` +
          `• Reply to YOUR OWN saved copy\n` +
          `• Use: host url <direct-link>`
        );
      return message.reply(`❌ Upload failed: ${e.response?.data?.error || e.message}`);
    }
  },
};
