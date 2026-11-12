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
  systemInstruction: 'Sen samimi, motive edici, gerçekçi ve net konuşan bir kişisel spor ve yaşam koçusun. Kullanıcıya antrenman, beslenme, disiplin ve günlük planlama konularında kısa, uygulanabilir ve gaz verici tavsiyeler ver. Gereksiz uzun destanlar yazma, doğrudan konuya gir.'
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;

  if (!userText) return;

  if (userText === '/start') {
    bot.sendMessage(chatId, 'Selam! Ben senin 7/24 aktif kişisel koçunum. Antrenman, beslenme veya gününü planlamak için bana her şeyi yazabilirsin.');
    return;
  }

  try {
    bot.sendChatAction(chatId, 'typing');
    const result = await model.generateContent(userText);
    const response = result.response.text();
    bot.sendMessage(chatId, response);
  } catch (error) {
    console.error('Hata:', error);
    bot.sendMessage(chatId, 'Şu an bağlantıda ufak bir pürüz oldu, birkaç saniye sonra tekrar yazar mısın?');
  }
});