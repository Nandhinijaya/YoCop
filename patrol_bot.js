// patrol_bot.js

import { config } from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";

config(); // Load environment variables from .env

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const userStates = {};

console.log("✅ YoCop Bot is running... Waiting for messages...");

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = { step: "ASK_PHONE" };
  console.log(`🟢 /start triggered by Chat ID: ${chatId}`);

  bot.sendMessage(chatId, "👮 Welcome to the YoCop Patrol Bot!\n\nPlease share your phone number:", {
    reply_markup: {
      keyboard: [[{
        text: "📲 Share Contact",
        request_contact: true
      }]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});

// /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  console.log(`ℹ️ /help requested by Chat ID: ${chatId}`);
  bot.sendMessage(chatId, "🆘 Help Menu:\n/start - Start Bot\n/help - Get Help\n/report - Report Incident");
});

// /report command
bot.onText(/\/report/, (msg) => {
  const chatId = msg.chat.id;
  console.log(`🚨 /report requested by Chat ID: ${chatId}`);
  bot.sendMessage(chatId, "🚨 Please describe the incident you want to report.");
});

// Handle contact (phone number)
bot.on("contact", (msg) => {
  const chatId = msg.chat.id;
  const contact = msg.contact;

  if (!userStates[chatId] || userStates[chatId].step !== "ASK_PHONE") return;

  userStates[chatId].phone = contact.phone_number;
  userStates[chatId].step = "MAIN_MENU";

  console.log(`✅ Phone number saved for Chat ID ${chatId}: ${contact.phone_number}`);

  bot.sendMessage(chatId, `✅ Phone number confirmed: ${contact.phone_number}`, {
    reply_markup: {
      keyboard: [["Show All Complaints", "Track Complaint"]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});

// Main message handler
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const state = userStates[chatId];

  if (!state || text.startsWith("/")) return;

  switch (state.step) {
    case "MAIN_MENU":
      if (text === "Show All Complaints") {
        console.log(`📄 Fetching complaints for phone ${state.phone}`);
        try {
          const response = await fetch("http://localhost:5000/getcomplaints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: state.phone })
          });

          const result = await response.json();

          if (!result || !result.data || result.error) {
            throw new Error(result?.error || "No data received");
          }

          const complaints = Array.isArray(result.data) ? result.data : [result.data];

          let message = "";

          for (const item of complaints) {
            let json;
            try {
              json = typeof item === "string"
                ? JSON.parse(item.replace(/`/g, "").replace(/'/g, '"'))
                : item;
            } catch {
              message += "⚠️ Failed to parse complaint.\n\n";
              continue;
            }

            const {
              trackingId,
              locationAddress,
              description,
              contactName,
              contactEmail,
              createdAt,
              PoliceAssigned,
              PoliceDispatched,
              PoliceArrived,
              Resolved,
              ipfsHash
            } = json;

            message += `🆔 Complaint ID: ${trackingId}\n📍 Location: ${locationAddress}\n📄 Description: ${description}\n📞 Contact: ${contactName} (${contactEmail})\n🕒 Created: ${new Date(createdAt).toLocaleString()}\n\n✅ Status:\n- Police Assigned: ${PoliceAssigned ? '✅' : '❌'}\n- Police Dispatched: ${PoliceDispatched ? '✅' : '❌'}\n- Police Arrived: ${PoliceArrived ? '✅' : '❌'}\n- Resolved: ${Resolved ? '✅' : '❌'}\n`;

            if (ipfsHash) {
              message += `🔗 View Evidence: https://ipfs.io/ipfs/${ipfsHash}\n`;
            }

            message += "\n---\n\n";
          }

          bot.sendMessage(chatId, message || "✅ You have no complaints.");
        } catch (error) {
          console.error("❌ Fetch error:", error.message);
          bot.sendMessage(chatId, "⚠️ Unable to fetch complaints at the moment.");
        }

      } else if (text === "Track Complaint") {
        state.step = "AWAITING_ID";
        bot.sendMessage(chatId, "🔍 Please enter the complaint ID to track:");
      } else {
        bot.sendMessage(chatId, "❓ Please choose an option from the menu.");
      }
      break;

    case "AWAITING_ID":
      try {
        console.log(`🔎 Tracking complaint ID: ${text}`);
        const response = await fetch("http://localhost:5000/getcomplaint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingId: text })
        });

        const result = await response.json();

        if (!result.data || result.error) {
          return bot.sendMessage(chatId, "❌ Complaint not found.");
        }

        const complaint = Array.isArray(result.data) ? result.data[0] : result.data;

        const {
          trackingId,
          locationAddress,
          description,
          contactName,
          contactEmail,
          createdAt,
          PoliceAssigned,
          PoliceDispatched,
          PoliceArrived,
          Resolved,
          ipfsHash
        } = complaint;

        const message = `🆔 Complaint ID: ${trackingId}
📍 Location: ${locationAddress}
📄 Description: ${description}
📞 Contact: ${contactName} (${contactEmail})
🕒 Created: ${new Date(createdAt).toLocaleString()}

✅ Status:
- Police Assigned: ${PoliceAssigned ? '✅' : '❌'}
- Police Dispatched: ${PoliceDispatched ? '✅' : '❌'}
- Police Arrived: ${PoliceArrived ? '✅' : '❌'}
- Resolved: ${Resolved ? '✅' : '❌'}
${ipfsHash ? `\n🔗 View Evidence: https://ipfs.io/ipfs/${ipfsHash}` : ""}`;

        bot.sendMessage(chatId, message);
      } catch (err) {
        console.error("❌ Tracking Error:", err.message);
        bot.sendMessage(chatId, "⚠️ Could not retrieve complaint status.");
      }

      state.step = "MAIN_MENU";
      break;

    default:
      bot.sendMessage(chatId, "❓ I didn’t understand that. Please try again.");
      break;
  }
});

// Handle polling errors
bot.on("polling_error", (err) => {
  console.error("❌ Polling Error:", err.code, err.message);
});
