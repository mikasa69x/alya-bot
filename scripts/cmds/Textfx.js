"use strict";

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const API_BASE = "https://sifu-text-fx-production.up.railway.app";

const EFFECTS = {
  1: { name: "Sunset Light",        cat: "Neon"     },
  2: { name: "Naruto Style",        cat: "Neon"     },
  3: { name: "Eroded Metal",        cat: "Metal"    },
  4: { name: "Bronze Glitter",      cat: "Glitter"  },
  5: { name: "Silver Glitter",      cat: "Glitter"  },
  6: { name: "Purple Glitter",      cat: "Glitter"  },
  7: { name: "Blue Glitter",        cat: "Glitter"  },
  8: { name: "Hexa Golden",         cat: "Metal"    },
  9: { name: "Hot Metal",           cat: "Metal"    },
  10: { name: "Purple Gem",         cat: "Glass"    },
  11: { name: "Metal Rainbow",      cat: "Metal"    },
  12: { name: "Sci-Fi",             cat: "Sci-Fi"   },
  13: { name: "Wood",               cat: "Nature"   },
  14: { name: "Bagel",              cat: "Food"     },
  15: { name: "Biscuit",            cat: "Food"     },
  16: { name: "Abstra Gold",        cat: "Metal"    },
  17: { name: "Rusty Metal",        cat: "Metal"    },
  18: { name: "Fruit Juice",        cat: "Food"     },
  19: { name: "Ice Cold",           cat: "Nature"   },
  20: { name: "Marble",             cat: "Nature"   },
  21: { name: "Horror Gift",        cat: "Horror"   },
  22: { name: "Plastic Bag",        cat: "Horror"   },
  23: { name: "Honey",              cat: "Food"     },
  24: { name: "Christmas Gift",     cat: "Seasonal" },
  25: { name: "Break Wall",         cat: "3D"       },
  26: { name: "Drop Water",         cat: "Nature"   },
  27: { name: "Advanced Glow",      cat: "Neon"     },
  28: { name: "Green Neon",         cat: "Neon"     },
  29: { name: "Bokeh",              cat: "Neon"     },
  30: { name: "Deluxe Silver",      cat: "Metal"    },
  31: { name: "Road Warning",       cat: "Horror"   },
  32: { name: "Neon",               cat: "Neon"     },
  33: { name: "3D Box",             cat: "3D"       },
  34: { name: "Thunder",            cat: "Neon"     },
  35: { name: "Neon Light",         cat: "Neon"     },
  36: { name: "Blood Text",         cat: "Horror"   },
  37: { name: "Matrix Hack",        cat: "Sci-Fi"   },
  38: { name: "Bread",              cat: "Food"     },
  39: { name: "Koi Fish",           cat: "Nature"   },
  40: { name: "Strawberry",         cat: "Food"     },
  41: { name: "Chocolate Cake",     cat: "Food"     },
  42: { name: "Colour Glass",       cat: "Glass"    },
  43: { name: "Purple Glass",       cat: "Glass"    },
  44: { name: "Cyan Jewelry",       cat: "Glass"    },
  45: { name: "Red Jewelry",        cat: "Glass"    },
  46: { name: "Toxic",              cat: "Horror"   },
  47: { name: "Rainbow EQ",         cat: "Neon"     },
  48: { name: "Robot R2-D2",        cat: "Sci-Fi"   },
  49: { name: "Captain America",    cat: "3D"       },
  50: { name: "Purple Shiny Glass", cat: "Glass"    },
  51: { name: "Blue Glass",         cat: "Glass"    },
  52: { name: "Orange Glass",       cat: "Glass"    },
  53: { name: "Yellow Glass",       cat: "Glass"    },
  54: { name: "Lava",               cat: "Horror"   },
  55: { name: "Rock",               cat: "Nature"   },
  56: { name: "Peridot Stone",      cat: "Nature"   },
  57: { name: "Decorate Purple",    cat: "Glass"    },
  58: { name: "Denim",              cat: "Nature"   },
  59: { name: "Steel",              cat: "Metal"    },
  60: { name: "Gold Foil Balloon",  cat: "3D"       },
  61: { name: "Green Foil Balloon", cat: "3D"       },
  62: { name: "Purple Foil Balloon",cat: "3D"       },
  63: { name: "Skeleton",           cat: "Horror"   },
  64: { name: "Fireworks Sparkle",  cat: "Neon"     },
  65: { name: "Natural Leaves",     cat: "Nature"   },
  66: { name: "Wicker",             cat: "Nature"   },
  67: { name: "Joker Logo",         cat: "Horror"   },
  68: { name: "Wolf Logo Galaxy",   cat: "Sci-Fi"   },
  69: { name: "Lion Logo",          cat: "3D"       },
  70: { name: "Metal Dark Gold",    cat: "Metal"    },
  71: { name: "Halloween Fire",     cat: "Horror"   },
  72: { name: "Frosted Blood",      cat: "Horror"   },
  73: { name: "Christmas 3D",       cat: "Seasonal" },
  74: { name: "3D Metal Galaxy",    cat: "3D"       },
  75: { name: "3D Metal Gold",      cat: "3D"       },
  76: { name: "3D Metal Rose Gold", cat: "3D"       },
  77: { name: "3D Metal Silver",    cat: "3D"       },
  78: { name: "New Year Firework",  cat: "Seasonal" },
  79: { name: "New Year 3D",        cat: "Seasonal" },
  80: { name: "Neon Glow",          cat: "Neon"     },
  81: { name: "Deluxe Gold",        cat: "Metal"    },
  82: { name: "Glossy Carbon",      cat: "Metal"    },
  83: { name: "3D Holographic",     cat: "3D"       },
  84: { name: "Minion 3D",          cat: "3D"       },
  85: { name: "Retro 1917",         cat: "Metal"    },
  86: { name: "Neon Galaxy",        cat: "Neon"     },
  87: { name: "Dark Gold Metal",    cat: "Metal"    },
  88: { name: "3D Glue",            cat: "3D"       },
  89: { name: "Summer Sand",        cat: "Nature"   },
  90: { name: "Sand Engraved",      cat: "Nature"   },
  91: { name: "Sand Writing",       cat: "Nature"   },
  92: { name: "Sand Beach",         cat: "Nature"   },
  93: { name: "Cloud Sky",          cat: "Nature"   },
  94: { name: "Christmas Snow",     cat: "Seasonal" },
  95: { name: "Graffiti Art",       cat: "Neon"     },
  96: { name: "Underwater 3D",      cat: "Nature"   },
  97: { name: "Watercolor",         cat: "Nature"   },
  98: { name: "Multicolor Paper",   cat: "3D"       },
  99: { name: "3D Glossy Metal",    cat: "3D"       },
  100: { name: "3D Gradient",       cat: "3D"       },
  101: { name: "Art Paper Cut",     cat: "3D"       },
  102: { name: "Broken Glass",      cat: "Glass"    },
  103: { name: "Cracked Surface",   cat: "3D"       },
  104: { name: "Harry Potter",      cat: "3D"       },
  105: { name: "Glitch Glass",      cat: "Glass"    },
  106: { name: "3D Neon Light",     cat: "Neon"     },
  107: { name: "3D Stone Cracked",  cat: "3D"       },
  108: { name: "Thunderstorm",      cat: "Neon"     },
  109: { name: "Berry",             cat: "Food"     },
  110: { name: "Transformer",       cat: "Sci-Fi"   },
  111: { name: "Green Horror",      cat: "Horror"   },
  112: { name: "Advance Glow",      cat: "Neon"     },
  113: { name: "Neon Pink",         cat: "Neon"     },
  114: { name: "Christmas Holiday", cat: "Seasonal" },
  115: { name: "3D Christmas",      cat: "Seasonal" },
  116: { name: "Candy Cane",        cat: "Seasonal" },
  117: { name: "Christmas Tree",    cat: "Seasonal" },
  118: { name: "Christmas Gift",    cat: "Seasonal" },
  119: { name: "Road Warning",      cat: "Horror"   },
  120: { name: "Horror Blood",      cat: "Horror"   },
  121: { name: "3D Sci-Fi",         cat: "Sci-Fi"   },
  122: { name: "3D Sci-Fi 2",       cat: "Sci-Fi"   },
  123: { name: "3D Gradient 2",     cat: "3D"       },
  124: { name: "Plastic Bag",       cat: "Horror"   },
  125: { name: "Space Text",        cat: "Sci-Fi"   },
  126: { name: "Robot",             cat: "Sci-Fi"   },
  127: { name: "Peridot",           cat: "Nature"   },
  128: { name: "Gold Foil Balloon 2",cat: "3D"      },
  129: { name: "Green Foil Balloon 2",cat: "3D"     },
  130: { name: "Koi Fish",          cat: "Nature"   },
  131: { name: "Neon Light",        cat: "Neon"     },
  132: { name: "Wolf Galaxy",       cat: "Sci-Fi"   },
  133: { name: "3D Metal",          cat: "3D"       },
  134: { name: "Summery Sand",      cat: "Nature"   },
  135: { name: "Sand 3D",           cat: "Nature"   },
  136: { name: "Blue Gem",          cat: "Glass"    },
  137: { name: "Biscuit 2",         cat: "Food"     },
  138: { name: "Chocolate",         cat: "Food"     },
  139: { name: "Pink Candy",        cat: "Food"     },
  140: { name: "Honey",             cat: "Food"     },
  141: { name: "Bagel 2",           cat: "Food"     },
  142: { name: "Strawberry 2",      cat: "Food"     },
  143: { name: "Bread 2",           cat: "Food"     },
  144: { name: "Orange Juice 3D",   cat: "Food"     },
  145: { name: "Berry 2",           cat: "Food"     },
  146: { name: "Eroded Metal",      cat: "Metal"    },
  147: { name: "Bronze",            cat: "Metal"    },
  148: { name: "Marble",            cat: "Nature"   },
  149: { name: "Hexa Gold",         cat: "Metal"    },
  150: { name: "Purple Glitter",    cat: "Glitter"  },
  151: { name: "Cyan Jewelry",      cat: "Glass"    },
  152: { name: "Orange Jewelry",    cat: "Glass"    },
  153: { name: "Red Jewelry",       cat: "Glass"    },
  154: { name: "Abstra Gold",       cat: "Metal"    },
  155: { name: "Silver Glitter",    cat: "Glitter"  },
  156: { name: "Gold Glitter",      cat: "Glitter"  },
  157: { name: "Blue Glitter",      cat: "Glitter"  },
  158: { name: "Purple Gem",        cat: "Glass"    },
  159: { name: "Sci-Fi Classic",    cat: "Sci-Fi"   },
  160: { name: "3D Sci-Fi Classic", cat: "Sci-Fi"   },
  161: { name: "Science Fiction",   cat: "Sci-Fi"   },
  162: { name: "Fruit Juice",       cat: "Food"     },
  163: { name: "3D Steel",          cat: "Metal"    },
  164: { name: "3D Box",            cat: "3D"       },
  165: { name: "3D Gradient Alt",   cat: "3D"       },
  166: { name: "3D Rainbow",        cat: "3D"       },
  167: { name: "Matrix",            cat: "Sci-Fi"   },
  168: { name: "Neon Blackpink",    cat: "Neon"     },
  169: { name: "Green Neon",        cat: "Neon"     },
  170: { name: "Glitch",            cat: "Sci-Fi"   },
  171: { name: "Thunder 2",         cat: "Neon"     },
  172: { name: "Glitch 2",          cat: "Sci-Fi"   },
  173: { name: "Metal Galaxy",      cat: "Metal"    },
  174: { name: "Rusted Metal",      cat: "Metal"    },
  175: { name: "3D Golden",         cat: "3D"       },
  176: { name: "3D Luxury Metallic",cat: "3D"       },
  177: { name: "Deluxe Gold 2",     cat: "Metal"    },
  178: { name: "3D Silver Metal",   cat: "3D"       },
  179: { name: "Metal Rainbow",     cat: "Metal"    },
  180: { name: "Rose Gold",         cat: "Metal"    },
  181: { name: "Night Party",       cat: "Neon"     },
  182: { name: "Night Party 2",     cat: "Neon"     },
};

const CAT_EMOJI = {
  Neon: "💠", Metal: "⚙️", "3D": "🎯", Glass: "🔷", Glitter: "✨",
  Nature: "🌿", Horror: "💀", "Sci-Fi": "🚀", Food: "🍓", Seasonal: "🎄"
};

function sc(str = "") {
  if (!str) return "";
  const map = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ";
  return String(str).toLowerCase().split("").map(c => {
    const i = c.charCodeAt(0) - 97;
    return (i >= 0 && i < 26) ? map[i] : c;
  }).join("");
}

const box  = (title, body) => `「 ${sc(title)} 」\n\n${body}`;
const kv   = (k, v)        => `┣ ${sc(k)}: ${v}`;
const warn = (msg)          => `⚠️ ${sc(msg)}`;
const fail = (title, msg)   => `❌ ${sc(title)}\n${sc(msg)}`;


function getByCategory(cat) {
  return Object.entries(EFFECTS)
    .filter(([, v]) => v.cat.toLowerCase() === cat.toLowerCase())
    .map(([id, v]) => `  #${String(id).padStart(3, "0")} │ ${v.name}`)
    .join("\n");
}

function searchEffects(query) {
  const q = query.toLowerCase();
  return Object.entries(EFFECTS)
    .filter(([, v]) => v.name.toLowerCase().includes(q))
    .slice(0, 20)
    .map(([id, v]) => `  #${String(id).padStart(3, "0")} │ ${v.name} [${v.cat}]`)
    .join("\n");
}

function randomId() {
  const ids = Object.keys(EFFECTS);
  return parseInt(ids[Math.floor(Math.random() * ids.length)]);
}

function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

async function getAttachment(buffer, effectId) {
 
  try {
    const stream = bufferToStream(buffer);
    stream.path = `textfx_${effectId}.png`;
    return stream;
  } catch (_) {}

  const tmpPath = path.join("/tmp", `textfx_${effectId}_${Date.now()}.png`);
  fs.writeFileSync(tmpPath, buffer);
  return fs.createReadStream(tmpPath);
}

module.exports = {
  config: {
    name:             "sifutext",
    aliases:          ["stx", "txtfx", "textfx", "tf"],
    version:          "1.0",
    author:           "SIFAT",
    countDown:        6,
    role:             0,
    shortDescription: { en: "182 stylish text effects" },
    longDescription:  { en: "Generate stylish text effect images using the SiFu Text FX API" },
    category:         "utility",
    guide:            { en: "{pn} <number> <text>\n{pn} random <text>\n{pn} list [category]\n{pn} search <keyword>" }
  },

  onStart: async function ({ api, event, args, message }) {
  
    try {
      api.setMessageReaction("✨", event.messageID);
    } catch (e) {
      console.log("Reaction error:", e);
    }

    if (!args[0]) {
      return message.reply(box("〕 |TEXT FX V1| 〔 ", [
        sc("|〔 commands 〕|"),
        `┣ tf <1-182> <text>    — apply effect`,
        `┣ tf random <text>     — random effect`,
        `┣ tf list              — show all categories`,
        `┣ tf list <category>   — list effects in category`,
        `┣ tf search <keyword>  — search effects by name`,
        "",
        sc("|〔 example 〕|"),
        `┣ tf 2 SIFAT`,
        `┣ tf random hello world`,
        `┣ tf list neon`,
        `┣ tf search gold`
      ].join("\n")));
    }

    const cmd = args[0].toLowerCase();

    if (cmd === "list") {
      const catArg = args[1] ? args[1].toLowerCase() : null;

      if (!catArg) {
        const summary = Object.entries(CAT_EMOJI)
          .map(([c, e]) => {
            const count = Object.values(EFFECTS).filter(x => x.cat === c).length;
            return `${e} ${sc(c)} — ${count}`;
          })
          .join("\n");
        return message.reply(box("categories", summary));
      }

      const normalise = s => {
        const map = { scifi: "Sci-Fi", "sci-fi": "Sci-Fi", "sci fi": "Sci-Fi",
                      "3d": "3D", glitter: "Glitter", metal: "Metal",
                      glass: "Glass", nature: "Nature", horror: "Horror",
                      neon: "Neon", food: "Food", seasonal: "Seasonal" };
        return map[s] || (s.charAt(0).toUpperCase() + s.slice(1));
      };

      const cat    = normalise(catArg);
      const emoji  = CAT_EMOJI[cat] || "🎨";
      const list   = getByCategory(cat);
      if (!list) return message.reply(warn(`no effects found for "${cat}"`));
      return message.reply(box(`${emoji} ${cat} effects`, list));
    }

    if (cmd === "search") {
      const query = args.slice(1).join(" ").trim();
      if (!query) return message.reply(warn("please provide a search keyword"));
      const res = searchEffects(query);
      if (!res)  return message.reply(warn(`no results for "${query}"`));
      return message.reply(box(`🔍 search: ${query}`, res));
    }

    const isRandom = ["random", "rand", "r"].includes(cmd);
    let effectId;

    if (isRandom) {
      effectId = randomId();
    } else {
      effectId = parseInt(args[0]);
      if (isNaN(effectId) || !EFFECTS[effectId]) {
        return message.reply(fail("invalid effect", `use a number from 1 to 182, or "random"`));
      }
    }

    const text = args.slice(1).join(" ").trim();
    if (!text)           return message.reply(warn("please provide text after the effect number"));
    if (text.length > 60) return message.reply(warn("text must be 60 characters or less"));

    const effect  = EFFECTS[effectId];
    const emoji   = CAT_EMOJI[effect.cat] || "🎨";
    let waitMsg;

    try {
      waitMsg = await message.reply(`⏳ ${sc(`generating #${effectId} — ${effect.name}...`)}`);
    } catch (_) {}

    try {
      const url      = `${API_BASE}/api/generate?text=${encodeURIComponent(text)}&number=${effectId}`;
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout:      60_000,
        headers:      { "Accept": "image/*" }
      });
      const contentType = response.headers["content-type"] || "";
      if (!contentType.includes("image") && response.data.byteLength < 100) {
        throw new Error("API returned non-image response");
      }
      const buffer     = Buffer.from(response.data);
      const attachment = await getAttachment(buffer, effectId);

      const caption = box("text effect", [
        kv("effect", `#${effectId} — ${effect.name}`),
        kv("style",  `${emoji} ${effect.cat}`),
        kv("text",   text),
        kv("chars",  `${text.length}/60`)
      ].join("\n"));

      await message.reply({ body: caption, attachment });

    } catch (error) {
      console.error("[SifuText] Error:", error.message);
      let errMsg = "api error or timeout — please try again";
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        errMsg = "request timed out — api may be busy, retry in a moment";
      } else if (error.response?.status === 429) {
        errMsg = "rate limited — wait a few seconds and try again";
      } else if (error.response?.status >= 500) {
        errMsg = "api server error — try again later";
      }

      await message.reply(fail(`effect #${effectId} failed`, errMsg));

    } finally {
      if (waitMsg?.messageID) {
        api.unsendMessage(waitMsg.messageID).catch(() => {});
      }
    }
  }
};
