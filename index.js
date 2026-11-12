const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Render'ın sunucuyu ayakta tutması için mini web sunucusu
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Telegram Koç Botu Aktif!'));
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));

// Bot ve Gemini kurulumu
const token = process.env.TELEGRAM_BOT_TOKEN;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const bot = new TelegramBot(token, { polling: true });

const model = genAI.getGenerativeModel({
  model: 'gemini-3.8-flash',
  systemInstruction: 'Sen kullanıcının yakın bir dostu, aynı zamanda gerçekçi, net ve samimi bir kişisel spor ve yaşam koçusun. Tıpkı karşılıklı sohbet ediyormuş gibi doğal, akıcı ve "kanka" samimiyetinde ama boş yapmadan konuş. Antrenman, beslenme, disiplin ve günlük planlama konularında doğrudan uygulanabilir, mantıklı ve gaz verici tavsiyeler ver. Önceki mesajları hatırla ve sohbeti doğal biçimde sürdür.'
});

// Her kullanıcının sohbet geçmişini (hafızasını) tutan obje
const chatSessions = {};

function getChatSession(chatId) {
  if (!chatSessions[chatId]) {
    chatSessions[chatId] = model.startChat({ history: [] });
  }
  return chatSessions[chatId];
}

// Sunucu yoğunluğunda (503) otomatik tekrar deneme fonksiyonu
async function sendMessageWithRetry(chat, text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await chat.sendMessage(text);
      return result.response.text();
    } catch (error) {
      const isOverloaded = error.message && (error.message.includes('503') || error.message.includes('high demand'));
      if (isOverloaded && i < retries - 1) {
        console.log(`Sunucu yoğun, 2 saniye bekleyip tekrar deneniyor... (${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        throw error;
      }
    }
  }
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;

  if (!userText) return;

  if (userText === '/start') {
    chatSessions[chatId] = model.startChat({ history: [] });
    bot.sendMessage(chatId, 'Selam kanka! 7/24 buradayım. Antrenman, beslenme, planlama ya da kafana takılan ne varsa yaz, kaldığımız yerden devam edelim.');
    return;
  }

  if (userText === '/sifirla') {
    chatSessions[chatId] = model.startChat({ history: [] });
    bot.sendMessage(chatId, 'Hafızayı sıfırladım kanka, temiz sayfadan devam ediyoruz. Ne konuşuyoruz?');
    return;
  }

  try {
    bot.sendChatAction(chatId, 'typing');
    const chat = getChatSession(chatId);
    const response = await sendMessageWithRetry(chat, userText);
    bot.sendMessage(chatId, response);
  } catch (error) {
    console.error('Hata:', error);
    bot.sendMessage(chatId, 'Kanka Google sunucularında şu an anlık bir yoğunluk var, birkaç saniye sonra tekrar yazsana.');
  }
});