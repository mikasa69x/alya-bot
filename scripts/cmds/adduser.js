const { findUid } = global.utils;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
	config: {
		name: "adduser",
		version: "3.0",
		author: "S1FU",
		countDown: 5,
		role: 1,
		description: {
			en: "Gently add new friends to your lovely group"
		},
		category: "box chat",
		guide: {
			en: "『 {pn} [Link | UID] 』"
		}
	},

	onStart: async function ({ message, api, event, args, threadsData }) {
		const { members, adminIDs, approvalMode } = await threadsData.get(event.threadID);
		const botID = api.getCurrentUserID();

		if (args.length === 0) {
			return message.reply(`╭─── 🅜🅘🅢🅢🅘🅝🅖 🅘🅝🅟🅤🅣🅢 ───╮\n\n『 🎀 』 ➜ Hey dear, please provide a Link or UID to add!\n\n╰───────────── ✩ ──╯`);
		}

		const addedUsers = [];
		const waitApproval = [];
		const failed = [];

		const regExMatchFB = /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|m\.facebook)\.(?:com|me)\/(?:(?:\w)*#!\/)?(?:pages\/)?(?:[\w\-]*\/)*([\w\-\.]+)(?:\/)?/i;
		
		for (const item of args) {
			let uid;
			if (isNaN(item) && regExMatchFB.test(item)) {
				try { uid = await findUid(item); } catch (e) { failed.push(item); continue; }
			} else if (!isNaN(item)) {
				uid = item;
			} else continue;

			if (members.some(m => m.userID == uid && m.inGroup)) {
				failed.push(item);
				continue;
			}

			try {
				await api.addUserToGroup(uid, event.threadID);
				const info = await api.getUserInfo(uid);
				const name = info[uid].name;

				if (approvalMode === true && !adminIDs.includes(botID)) {
					waitApproval.push({ name, uid });
				} else {
					addedUsers.push({ name, uid });
				}
			} catch (err) {
				failed.push(item);
			}
		}

		let msg = "╭───── ✩ 𝖠𝖽𝖽 𝖴𝗌𝖾𝗋 ✩ ─────╮\n\n";
		const mentions = [];

		if (addedUsers.length > 0) {
			msg += `『 ✨ 』 ➜ 𝖲𝗎𝖼𝖼𝖾𝗌𝗌𝖿𝗎𝗅𝗅𝗒 𝖠𝖽𝖽𝖾𝖽:\n`;
			addedUsers.forEach(u => {
				msg += ` • ${u.name} ✨\n`;
				mentions.push({ tag: u.name, id: u.uid });
			});
			msg += `\n『 🧸 』 ➜ 𝖶𝖾𝗅𝖼𝗈𝗆𝖾 𝗍𝗈 𝗈𝗎𝗋 𝖿𝖺𝗆𝗂𝗅𝗒!\n`;
		}

		if (waitApproval.length > 0) {
			msg += `『 ⏳ 』 ➜ 𝖯𝖾𝗇𝖽𝗂𝗇𝗀 𝖠𝗉𝗉𝗋𝗈𝗏𝖺𝗅:\n`;
			waitApproval.forEach(u => {
				msg += ` • ${u.name} (Waiting...)\n`;
			});
		}

		if (failed.length > 0 && addedUsers.length === 0 && waitApproval.length === 0) {
			msg += `『 🎐 』 ➜ 𝖮𝗈𝗽𝗌! 𝖢𝗈𝗎𝗅𝖽𝗇'𝗍 𝖺𝖽𝖽 𝗍𝗁𝗂𝗌 𝗎𝗌𝖾𝗋.\n『 🌸 』 ➜ 𝖬𝖺𝗒𝖻𝖾 𝗍𝗁𝖾𝗒 𝖻𝗅𝗈𝖼𝗄𝖾𝖽 𝗌𝗍𝗋𝖺𝗇𝗀𝖾𝗋𝗌~`;
		}

		msg += "\n╰───────────── ✩ ──╯";

		return api.sendMessage({ body: msg, mentions }, event.threadID);
	}
};
