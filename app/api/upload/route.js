const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/api/upload", upload.single("audio"), async (req, res) => {
  const filePath = req.file.path;

  // 1. Send audio to OpenAI Whisper or another API
  const audioData = fs.createReadStream(filePath);

  const whisperRes = await axios.post(
    "https://api.openai.com/v1/audio/transcriptions",
    audioData,
    {
      headers: {
        Authorization: `Bearer YOUR_OPENAI_API_KEY`,
        "Content-Type": "audio/wav",
      },
    }
  );

  const transcription = whisperRes.data.text;

  // 2. Send transcription to Telegram
  const chatId = "YOUR_TELEGRAM_CHAT_ID"; // Replace this
  const botToken = "YOUR_BOT_TOKEN";

  await axios.post(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      chat_id: chatId,
      text: `📞 Call transcription:\n${transcription}`,
    }
  );

  res.send({ status: "success", transcription });
});
