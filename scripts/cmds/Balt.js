module.exports = {
  config: {
    name: "balt",
    aliases: ["sendmoney"],
    version: "1.0",
    author: "XIYAM",
    role: 1,
    shortDescription: { en: "Manage users' balance" },
    longDescription: { en: "Add balance by replying" },
    category: "economy",
    guide: { en: "Reply + balt [amount]  (অথবা balt out)" }
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    let targetID = null;
    const send = (text) => api.sendMessage(text, threadID, messageID);

    // Target ID Priority: Reply > Mention > UID
    if (messageReply) {
      targetID = messageReply.senderID;
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (args[1] && !isNaN(args[1])) {
      targetID = args[1];
    }

    const firstArg = args[0]?.toLowerCase().trim();

    // ==================== OUT COMMAND ====================
    if (firstArg === "out") {
      if (!targetID) {
        return send("❌ Reply করে বা mention করে out কমান্ড দাও।");
      }
      await usersData.set(targetID, { money: 0 });
      const name = (await usersData.get(targetID)).name;
      return send(`❌ ${name}'s balance has been reset to 0.`);
    }

    // ==================== TRANSFER COMMAND ====================
    if (firstArg === "transfer") {
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) return send("❌ Valid amount দাও।");
      if (!targetID) return send("❌ Reply / mention / uid দাও।");
      if (targetID === senderID) return send("❌ নিজেকে ট্রান্সফার করা যাবে না।");

      const senderData = await usersData.get(senderID);
      if (senderData.money < amount) return send("❌ তোমার পর্যাপ্ত টাকা নেই।");

      await usersData.subtractMoney(senderID, amount);
      await usersData.addMoney(targetID, amount);
      const targetName = (await usersData.get(targetID)).name;
      return send(`✅ ${amount}💵 ট্রান্সফার করা হয়েছে ${targetName}-কে।`);
    }

    // ==================== DEFAULT: ADD MONEY (শুধু balt + amount) ====================
    const amount = parseInt(firstArg);   // যদি balt 500 লেখা হয়

    if (!isNaN(amount) && amount > 0) {
      if (!targetID) {
        return send("❌ Reply করে balt [amount] দাও।");
      }

      await usersData.addMoney(targetID, amount);
      const name = (await usersData.get(targetID)).name;
      return send(`✅ ${amount}💵 অ্যাড করা হয়েছে ${name}-এর ব্যালেন্সে।`);
    }

    // ==================== WRONG USAGE ====================
    send(`❗ **সঠিক ব্যবহার:**\n\n` +
         `• Reply করে → balt [amount]     (টাকা অ্যাড হবে)\n` +
         `• balt out                    (ব্যালেন্স শূন্য করতে)\n` +
         `• balt transfer [amount]     (ট্রান্সফার করতে)`);
  }
};
