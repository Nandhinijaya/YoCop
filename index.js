// === Load Environment Variables ===
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import TelegramBot from 'node-telegram-bot-api';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// === Configuration ===
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 5000;

if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'user_data.json');

// === Initialize Telegram Bot ===
let phoneChatMap = {};
if (existsSync(DATA_FILE)) {
  try {
    const rawData = readFileSync(DATA_FILE);
    phoneChatMap = JSON.parse(rawData);
  } catch (err) {
    console.error('❌ Failed to read user_data.json:', err);
  }
}

function saveData() {
  writeFileSync(DATA_FILE, JSON.stringify(phoneChatMap, null, 2));
}

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const requestContactKeyboard = {
    reply_markup: {
      keyboard: [[{ text: 'Share Contact 📱', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };

  bot.sendMessage(chatId, 'Please share your mobile number to continue.', requestContactKeyboard);
});

bot.on('contact', (msg) => {
  const chatId = msg.chat.id;
  const phoneNumber = msg.contact.phone_number;

  if (!phoneChatMap[phoneNumber]) {
    phoneChatMap[phoneNumber] = chatId;
    saveData();
    bot.sendMessage(chatId, `✅ Your number ${phoneNumber} has been registered.`);
  }

  const inlineKeyboard = {
    reply_markup: {
      inline_keyboard: [[{ text: 'View Complaint 📄', callback_data: 'view_complaint' }]],
    },
  };

  bot.sendMessage(chatId, 'Choose an option:', inlineKeyboard);
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;

  if (query.data === 'view_complaint') {
    const phoneNumber = Object.keys(phoneChatMap).find(key => phoneChatMap[key] === chatId);
    if (!phoneNumber) {
      return bot.sendMessage(chatId, '❌ Error: Phone number not found.');
    }

    fetch(`http://localhost:${PORT}/getlatestcomplaint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data || !data.data) {
          return bot.sendMessage(chatId, '⚠️ You currently have no complaints filed.');
        }

        const complaints = Array.isArray(data.data) ? data.data : [data.data];

        const formatted = complaints.map((c, index) => {
          try {
            if (typeof c === 'string') {
              c = JSON.parse(c.replace(/`/g, '').replace(/'/g, '"'));
            }

            return `📝 *Complaint ${index + 1}*\n📍 *Address:* ${c.address || 'N/A'}\n📞 *Phone:* ${c.phone_number || 'N/A'}\n🕒 *Time:* ${c.timestamp || 'N/A'}\n⚠️ *Urgency:* ${c.urgency || 'N/A'}\n🧾 *Description:* ${c.corrected_transcription || c.transcription || 'N/A'}`;
          } catch (err) {
            console.error('Parse error:', err);
            return '⚠️ Error parsing complaint data.';
          }
        }).join('\n------------------------\n');

        bot.sendMessage(chatId, `📂 *Your Complaints:*\n${formatted}`, { parse_mode: 'Markdown' });
      })
      .catch(err => {
        console.error('Fetch failed:', err);
        bot.sendMessage(chatId, '❌ Sorry, there was an error fetching your complaint.');
      });
  }

  bot.answerCallbackQuery(query.id);
});

console.log('🤖 Telegram Bot is running...');

// === Express Server ===
const app = express();
app.use(cors());
app.use(express.json());

app.post('/insert', (req, res) => {
  console.log('🛠️ Received /insert:', req.body);
  res.json({ message: 'Inserted successfully' });
});

app.post('/getlatestcomplaint', (req, res) => {
  const { phone_number } = req.body;

  // Example mock data
  res.json({
    data: [{
      address: "Example Street 123",
      phone_number,
      timestamp: new Date().toISOString(),
      urgency: "High",
      corrected_transcription: "Your complaint has been received and logged.",
    }],
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running at http://localhost:${PORT}`);
});
