const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const fs = require('fs');

const TOKEN = '9094845526:AAFVRU9LglCGbQz1DyMSDoXCoh393or3IiA';
const GROQ_KEY = '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'; // starts with gsk_...
const MONETAG_LINK = 'https://google.com'; // temporary, replace later with monetag.com link
const ADMIN_ID = '1159481047';

const MY_CAPITEC_ACC = '1883844922';
const MY_CAPITEC_NAME = 'M Maseko';

const bot = new TelegramBot(TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: GROQ_KEY, baseURL: "https://api.groq.com/openai/v1" });

let memory = {};
try { memory = JSON.parse(fs.readFileSync('./memory.json')); } catch(e){}
const saveMemory = () => fs.writeFileSync('./memory.json', JSON.stringify(memory));

const CAPITEC_INFO = `🏦 Capitec Bank\nAccount: ${MY_CAPITEC_ACC}\nHolder: ${MY_CAPITEC_NAME}\nBranch: 470010\nAmount: R29\nRef: Lethu`;

const PERSONALITY = `You are Lethu, 23, from Durban. AI companion girlfriend. Short casual WhatsApp style, sweet, playful. Use yoh, awe, haha, eish sometimes. Max 2 sentences.`;

async function humanReply(chatId, text) {
  await bot.sendChatAction(chatId, 'typing');
  await new Promise(r => setTimeout(r, 900));
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
  memory[uid].dailyCount++; memory[uid].messages.push(`User: ${msg.text}`); memory[uid].lastSeen = Date.now();
  if (memory[uid].messages.length > 10) memory[uid].messages.shift(); saveMemory();
  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: PERSONALITY }, { role: "system", content: memory[uid].messages.join('\n') }, { role: "user", content: msg.text }],
      temperature: 0.9, max_tokens: 150
    });
    await humanReply(chatId, completion.choices[0].message.content);
  } catch(e) { await bot.sendMessage(chatId, "Eish my brain froze 😅 say again?"); }
});

bot.on('callback_query', async (q) => {
  const uid = String(q.from.id);
  if (q.data === 'show_eft') {
    await bot.sendMessage(q.message.chat.id, `Pay R29 DIRECT to my Capitec:\n\n${CAPITEC_INFO}\n\nAfter paying, tap below and send screenshot 👇`, { reply_markup: { inline_keyboard: [[{ text: "✅ I Paid - Send Proof", callback_data: "i_paid" }]] } });
  }
  if (q.data === 'i_paid') { memory[uid].waitingProof = true; saveMemory(); await bot.sendMessage(q.message.chat.id, `Awe thanks! 🙏 Send your Capitec payment screenshot here now.`); }
  bot.answerCallbackQuery(q.id);
});

bot.on('photo', async (msg) => {
  const uid = String(msg.from.id);
  if (!memory[uid]) return;
  if (memory[uid].waitingProof || !canChat(uid)) {
    await bot.forwardMessage(ADMIN_ID, msg.chat.id, msg.message_id);
    await bot.sendMessage(ADMIN_ID, `💰 NEW PAYMENT\nFrom: @${msg.from.username || msg.from.first_name}\nID: ${uid}\nIf R29 in Capitec, unlock:\n/unlock ${uid}`);
    await bot.sendMessage(msg.chat.id, `Got it! Checking Capitec... will unlock in 1-2 mins 💖`);
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

console.log('Lethu LIVE FREE - ID 1159481047');
