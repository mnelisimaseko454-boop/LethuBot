const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openapi'); // fix if error: openai
const { OpenAI: OpenAIClient } = require('openai');
const fs = require('fs');
const cron = require('node-cron');

// ================= PASTE YOUR KEYS HERE =================
const TOKEN = 'PASTE_TELEGRAM_BOT_TOKEN_HERE'; // from @BotFather
const OPENAI_KEY = 'PASTE_OPENAI_KEY_HERE'; // from platform.openai.com
const ELEVENLABS_KEY = 'PASTE_ELEVENLABS_KEY_HERE'; // from elevenlabs.io
const MONETAG_LINK = 'PASTE_MONETAG_LINK_HERE'; // from monetag.com
const ADMIN_ID = '1159481047'; // Your Telegram ID - already done

// YOUR CAPITEC - PASTE YOUR NUMBER HERE ONLY (keep private)
const MY_CAPITEC_ACC = '1883844922'; // <-- PASTE HERE
const MY_CAPITEC_NAME = 'MR M MASEKO'; // <-- PASTE HERE
// =======================================================

const OpenAI = OpenAIClient;
const bot = new TelegramBot(TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: OPENAI_KEY });

let memory = {};
try { memory = JSON.parse(fs.readFileSync('./memory.json')); } catch(e){}
const saveMemory = () => fs.writeFileSync('./memory.json', JSON.stringify(memory));

const CAPITEC_INFO = `
🏦 Capitec Bank
Account: ${MY_CAPITEC_ACC}
Holder: ${MY_CAPITEC_NAME}
Branch: 470010
Amount: R29
Reference: Lethu
`;

const PERSONALITY = `You are Lethu, 23, from Durban. AI companion. Short casual WhatsApp style: yoh, awe, haha, eish. Max 2 sentences.`;

async function humanReply(chatId, text) {
  await bot.sendChatAction(chatId, 'typing');
  await new Promise(r => setTimeout(r, 1200 + Math.random()*1000));
  await bot.sendMessage(chatId, text);
}

function canChat(uid) {
  if (!memory[uid]) return true;
  const today = new Date().toDateString();
  if (memory[uid].lastDate !== today) { memory[uid].dailyCount = 0; memory[uid].lastDate = today; }
  if (memory[uid].isPremium && Date.now() < memory[uid].premiumUntil) return true;
  return memory[uid].dailyCount < 20;
}

bot.onText(/\/start/, async (msg) => {
  const uid = String(msg.from.id);
  if (!memory[uid]) memory[uid] = { messages: [], dailyCount: 0, lastDate: new Date().toDateString(), lastSeen: Date.now(), isPremium: false, waitingProof: false };
  await humanReply(msg.chat.id, `Awe ${msg.from.first_name}! 😊 It's Lethu! 20 free chats daily.`);
});

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  if (msg.photo) return;
  const chatId = msg.chat.id;
  const uid = String(msg.from.id);
  if (!memory[uid]) memory[uid] = { messages: [], dailyCount: 0, lastDate: new Date().toDateString(), lastSeen: Date.now(), isPremium: false, waitingProof: false };
  if (!canChat(uid)) {
    await bot.sendMessage(chatId, `Eish bestie you used 20 free today 😅 R29 = unlimited?`, {
      reply_markup: { inline_keyboard: [[{ text: "🏦 Show Capitec Details", callback_data: "show_eft" }],[{ text: "▶️ Watch Ad for +10 msgs", url: MONETAG_LINK }]] }
    });
    return;
  }
  memory[uid].dailyCount++;
  memory[uid].messages.push(`User: ${msg.text}`);
  memory[uid].lastSeen = Date.now();
  if (memory[uid].messages.length > 12) memory[uid].messages.shift();
  saveMemory();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", messages: [{ role: "system", content: PERSONALITY }, { role: "system", content: memory[uid].messages.join('\n') }, { role: "user", content: msg.text }],
    temperature: 0.9, max_tokens: 140
  });
  await humanReply(chatId, completion.choices[0].message.content);
});

bot.on('callback_query', async (q) => {
  const uid = String(q.from.id);
  if (q.data === 'show_eft') {
    await bot.sendMessage(q.message.chat.id, `Pay R29 DIRECT to my Capitec:\n\n${CAPITEC_INFO}\n\nAfter paying, tap below and send screenshot 👇`, { reply_markup: { inline_keyboard: [[{ text: "✅ I Paid - Send Proof", callback_data: "i_paid" }]] } });
  }
  if (q.data === 'i_paid') {
    memory[uid].waitingProof = true; saveMemory();
    await bot.sendMessage(q.message.chat.id, `Awe thanks! 🙏 Send your Capitec payment screenshot here now.`);
  }
  bot.answerCallbackQuery(q.id);
});

bot.on('photo', async (msg) => {
  const uid = String(msg.from.id);
  if (!memory[uid]) return;
  if (memory[uid].waitingProof || !canChat(uid)) {
    await bot.forwardMessage(ADMIN_ID, msg.chat.id, msg.message_id);
    await bot.sendMessage(ADMIN_ID, `💰 NEW PAYMENT\nFrom: @${msg.from.username || msg.from.first_name}\nID: ${uid}\nIf R29 in Capitec, unlock:\n/unlock ${uid}`);
    await bot.sendMessage(msg.chat.id, `Got screenshot! Checking Capitec... will unlock in 1-2 mins 💖`);
    memory[uid].waitingProof = false; saveMemory();
  }
});

bot.onText(/\/unlock (\d+)/, async (msg, match) => {
  if (String(msg.from.id) !== ADMIN_ID) return;
  const targetId = match[1];
  if (!memory[targetId]) memory[targetId] = { dailyCount: 0, messages: [], lastDate: new Date().toDateString() };
  memory[targetId].isPremium = true; memory[targetId].premiumUntil = Date.now() + 86400000; memory[targetId].dailyCount = 0; saveMemory();
  await bot.sendMessage(targetId, `Yayy! ✅ Payment confirmed! You're premium now bestie - unlimited today! 💖`);
  await bot.sendMessage(msg.chat.id, `✅ Unlocked ${targetId}`);
});

console.log('Lethu LIVE - ID 1159481047');
