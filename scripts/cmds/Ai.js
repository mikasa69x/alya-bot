const axios = require("axios");

module.exports = {
  config: {
    name: "gpt4",
    version: "1.0",
    author: "Ry",
    countDown: 3,
    role: 0,
    category: "ai",
    shortDescription: {
      en: "AI powered "
    },
    longDescription: {
      en: "Chat with GPT-4 model"
    },
    guide: {
      en: "{p}ai [prompt]"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { messageID, messageReply, threadID, senderID } = event;
    let userInput = args.join(" ").trim();

    if (messageReply) {
      const repliedMessage = messageReply.body;
      userInput = `${repliedMessage} ${userInput}`;
    }

    if (!userInput) {
      return api.sendMessage('Usage: ai [your question]', threadID, messageID);
    }

    try {
      await fetchAIResponse(api, event, userInput, senderID);
    } catch (error) {
      console.error(`Error fetching AI response for "${userInput}":`, error);
      api.sendMessage(`Sorry, there was an error getting the AI response!`, threadID, messageID);
    }
  },
};

async function fetchAIResponse(api, event, userInput, senderID) {
  const { threadID, messageID } = event;

  try {
    // Updated API endpoint with the new yin-api URL
    const apiUrl = `https://yin-api.vercel.app/ai/chatgptfree?prompt=${encodeURIComponent(userInput)}&model=chatgpt4`;
    const response = await axios.get(apiUrl);

    if (response.data && response.data.answer) {
      const generatedText = response.data.answer;
      const operator = response.data.operator || 'Ry';

      api.getUserInfo(senderID, (err, ret) => {
        if (err) {
          console.error('❌ Error fetching user info:', err);
          api.sendMessage('Error fetching user info.', threadID, messageID);
          return;
        }

        const userName = ret[senderID].name;
        const formattedResponse = `━━━━━━━━━━━━━━━━━━\n${generatedText}\n━━━━━━━━━━━━━━━━━━`;

        api.sendMessage(formattedResponse, threadID, messageID);
      });
    } else {
      api.sendMessage('❌ An error occurred while generating the response. Please try again later.', threadID, messageID);
    }
  } catch (error) {
    console.error('Error fetching from Yin API:', error.message || error);
    api.sendMessage(`Sorry, there was an error connecting to the AI service!`, threadID, messageID);
  }
}
