const axios = require("axios");
const baseApiUrl = async () => {
    const base = await axios.get(
        `https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`,
    );
    return base.data.api;
};
async function getAvatarUrls(userIDs) {
    let avatarURLs = [];

    for (let userID of userIDs) {
        try {
            const shortUrl = `https://graph.facebook.com/${userID}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            const d = await axios.get(shortUrl);
            let url = d.request.res.responseUrl;
            avatarURLs.push(url);
        } catch (error) {
            avatarURLs.push(
"https://i.ibb.co/qk0bnY8/363492156-824459359287620-3125820102191295474-n-png-nc-cat-1-ccb-1-7-nc-sid-5f2048-nc-eui2-Ae-HIhi-I.png");
        }
    }
    return avatarURLs;
}
module.exports = {
    config: {
        name: "allphoto",
        aliases: ["gcimage", "grpimage"],
        version: "1.0",
        author: "Dipto",
        countDown: 5,
        role: 0,
        description: "𝗚𝗲𝘁 𝗚𝗿𝗼𝘂𝗽 𝗜𝗺𝗮𝗴𝗲",
        category: "𝗜𝗠𝗔𝗚𝗘",
        guide: "{pn} --color [color] --bgcolor [color] --admincolor [color] --membercolor [color]",
    },

    onStart: async function ({ api, args, event, message }) {
        try {
            let tid;
            let color = "white"; //text color
            let bgColor;
            let adminColor = "yellow";
            let memberColor = "cyan";
            let groupborderColor = "lime";
            let glow = false;

            for (let i = 0; i < args.length; i++) {
                switch (args[i]) {
                    case "--color":
                        color = args[i + 1];
                        args.splice(i, 2);
                        break;
                    case "--bgcolor":
                        bgColor = args[i + 1];
                        args.splice(i, 2);
                        break;
                    case "--admincolor":
                        adminColor = args[i + 1];
                        args.splice(i, 2);
                        break;
                    case "--membercolor":
                        memberColor = args[i + 1];
                        args.splice(i, 2);
                        break;
                    case "--groupBorder":
                    groupborderColor = args[i + 1];
                    args.splice(i,2);
                        break;
                        case "--glow":
                    glow = args[i + 1];
                    args.splice(i,2);
                        break;
                }
            }

            let threadInfo = await api.getThreadInfo(event.threadID);
            let participantIDs = threadInfo.participantIDs;
            let adminIDs = threadInfo.adminIDs.map((admin) => admin.id);
            let memberURLs = await getAvatarUrls(participantIDs);
            let adminURLs = await getAvatarUrls(adminIDs);

            const data2 = {
                memberURLs: memberURLs,
                groupPhotoURL: threadInfo.imageSrc,
                adminURLs: adminURLs,
                groupName: threadInfo.threadName,
                bgcolor: bgColor,
                admincolor: adminColor,
                membercolor: memberColor,
                color: color,
                groupborderColor,
                glow
            };

            if (data2) {
                var waitingMsg = await api.sendMessage("⏳ |𝑲𝒐𝒓𝒕𝒆𝒄𝒉𝒊𝒕𝒐 𝒃𝒃𝒚 𝒆𝒌𝒕𝒖 𝒘𝒂𝒊𝒕 𝒌𝒐𝒓𝒐 😷😙.",event.threadID);
                api.setMessageReaction(
                    "⏳",
                    event.messageID,
                    (err) => {},
                    true,
                );
            }
            const { data } = await axios.post(
                `${await baseApiUrl()}/gcimg`,
                data2,
                { responseType: "stream" }
            );


                api.setMessageReaction(
                    "✅",
                    event.messageID,
                    (err) => {},
                    true);
                message.unsend(waitingMsg.messageID);
                message.reply({
                    body: `𝑯𝒆𝒓𝒆 𝒊𝒔 𝒚𝒐𝒖𝒓 𝒈𝒓𝒐𝒖𝒑 𝒊𝒎𝒂𝒈𝒆 𝒃𝒃𝒚 <😘`,
                    attachment: data,
                });

        } catch (error) {
            console.log(error);
            message.reply(`❌ | 𝙴𝚛𝚛𝚘𝚛: ${error.message}`);
        }
    },
};
