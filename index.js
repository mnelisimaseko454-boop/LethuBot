// ============================================
// LethuChatBot - Telegram Bot + Mini App
// Check-ins, Mood, Goals, Journal, Voice, VIP
// OnClickA: Rewarded 6155340 / Inpage 472564
// ============================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL; // e.g. https://lethuchatbot-xxxx.onrender.com
const ADMIN_ID = process.env.ADMIN_ID; // your Telegram ID

if(!TOKEN || !WEBAPP_URL){
  console.log('❌ Missing BOT_TOKEN or WEBAPP_URL in Render Env');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req,res)=> res.send('LETHUCHATBOT AWAKE - LethuChatBot is live 🤝'));
app.get('/health', (req,res)=> res.json({ ok:true, bot:'LethuChatBot' }));

// ===== In-memory store (upgrade to DB later) =====
const users = new Map(); // id -> {id, name, username, mood:[], goals:[], journal:[], vipUntil:0, streak:0, lastCheckin:0, checkins:0}
const getUser = (msg) => {
  const id = msg.chat.id;
  if(!users.has(id)){
    users.set(id, { id, name: msg.from.first_name || 'friend', username: msg.from.username || '', mood:[], goals:[], journal:[], vipUntil:0, streak:0, lastCheckin:0, checkins:0, created: Date.now() });
  }
  return users.get(id);
};
const isVip = (u) => Date.now() < (u.vipUntil || 0);
const vipLabel = (u) => isVip(u) ? `👑 VIP until ${new Date(u.vipUntil).toLocaleDateString('en-ZA')}` : 'Free';
const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💬 OPEN CHAT' }, { text: '😊 MOOD' }],
      [{ text: '🎯 GOAL' }, { text: '📓 JOURNAL' }],
      [{ text: '🎙️ VOICE' }, { text: '👑 VIP' }],
      [{ text: '📊 MY PROGRESS' }, { text: '⚙️ SETTINGS' }]
    ],
    resize_keyboard: true
  }
};
const webAppKeyboard = {
  reply_markup: {
    inline_keyboard: [[{ text: '💬 OPEN CHAT - LethuChatBot', web_app: { url: WEBAPP_URL } }]]
  }
};

// ===== /start =====
bot.onText(/\/start/, async (msg) => {
  const u = getUser(msg);
  await bot.sendMessage(msg.chat.id,
`Hey ${u.name}! 👋 I'm **LethuChatBot**.

Your daily check-in buddy. I'm here for you, not to judge you.

**What I do:**
😊 Mood check-ins 3x a day
🎯 Goals - save & remind you
📓 Journal prompts
🎙️ Voice notes (VIP)
🔥 Streaks to keep you going

Tap OPEN CHAT below for WhatsApp-style chat.

You're not alone. 🤝`,
  { parse_mode: 'Markdown', ...webAppKeyboard });
  await bot.sendMessage(msg.chat.id, `Welcome back, ${u.name}! What do you want to do? ${vipLabel(u)}`, mainKeyboard);
});

// ===== /help =====
bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(msg.chat.id,
`🤝 **LethuChatBot Help**

💬 OPEN CHAT - WhatsApp-style chat
😊 MOOD - Log how you feel
🎯 GOAL - Save a goal
📓 JOURNAL - Get a prompt
🎙️ VOICE - Send voice note (VIP)
👑 VIP - 50 ⭐ / week or 150 ⭐ / month
📊 MY PROGRESS - See streak + goals

Watch Ad in Mini App = Free VIP Day 📺

Type /start to restart.`,
  { parse_mode: 'Markdown' });
});

// ===== WebApp data from Mini App =====
bot.on('web_app_data', async (msg) => {
  try{
    const data = JSON.parse(msg.web_app_data.data);
    const u = getUser(msg);
    if(data.action === 'mood'){
      u.mood.push({ mood: data.mood, time: Date.now() });
      u.streak++;
      await bot.sendMessage(msg.chat.id, `Mood logged: ${data.mood} 🔥 Streak: ${u.streak} days. Nice one, ${u.name}.`);
    }
    if(data.action === 'goal'){
      u.goals.push({ text: data.text, done: false, time: Date.now() });
      await bot.sendMessage(msg.chat.id, `🎯 Goal saved: "${data.text}"\nI'll remind you about it in check-ins.`);
    }
    if(data.action === 'buy_vip'){
      await sendVipInvoice(msg.chat.id, data.type || 'month');
    }
  }catch(e){ console.log('web_app_data error', e.message); }
});

// ===== VIP Invoices - Telegram Stars =====
async function sendVipInvoice(chatId, type){
  const isWeek = type === 'week';
  const title = isWeek ? 'LethuChatBot VIP - Week' : 'LethuChatBot VIP - Month';
  const desc = isWeek
    ? 'LethuChatBot VIP for 7 days: Unlimited goals, 5 voice slots, priority check-ins, no limits.'
    : 'LethuChatBot VIP for 30 days: Unlimited goals, 5 voice slots, priority check-ins, no limits.';
  const payload = isWeek ? 'lethu_vip_week' : 'lethu_vip_month';
  const prices = [{ label: title, amount: isWeek ? 50 : 150 }]; // Stars
  try{
    await bot.sendInvoice(chatId, title, desc, payload, '', 'XTR', prices, { need_name: false });
  }catch(e){
    await bot.sendMessage(chatId, `⚠️ Couldn't open Stars checkout: ${e.message}\nTry again or message admin.`);
  }
}
bot.onText(/\/vip|👑 VIP/, async (msg) => {
  const u = getUser(msg);
  await bot.sendMessage(msg.chat.id,
`👑 **LethuChatBot VIP** - ${vipLabel(u)}

**Free:** 1 goal, 1 voice note, basic check-ins
**VIP:** Unlimited goals, 5 voice slots, priority check-ins

💸 **Prices:**
• Week - 50 ⭐
• Month - 150 ⭐ (best value)

📺 Or watch an Ad in Mini App = Free VIP Day`,
  { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
    [{ text: '👑 VIP Week - 50 ⭐', callback_data: 'vip_week' }],
    [{ text: '👑 VIP Month - 150 ⭐', callback_data: 'vip_month' }],
    [{ text: '📺 Free VIP Day - Watch Ad', web_app: { url: WEBAPP_URL } }]
  ]}});
});
bot.on('callback_query', async (q) => {
  if(q.data === 'vip_week') await sendVipInvoice(q.message.chat.id, 'week');
  if(q.data === 'vip_month') await sendVipInvoice(q.message.chat.id, 'month');
  await bot.answerCallbackQuery(q.id).catch(()=>{});
});
bot.on('pre_checkout_query', async (q) => {
  await bot.answerPreCheckoutQuery(q.id, true).catch(()=>{});
});
bot.on('successful_payment', async (msg) => {
  const u = getUser(msg);
  const payload = msg.successful_payment.invoice_payload;
  const days = payload === 'lethu_vip_week' ? 7 : 30;
  u.vipUntil = Date.now() + days*24*60*60*1000;
  await bot.sendMessage(msg.chat.id,
`🎉 **VIP ACTIVATED!** 👑\n\nThanks ${u.name}! You now have LethuChatBot VIP for ${days} days.\nUnlimited goals + 5 voice slots + priority check-ins.\n\nTap 💬 OPEN CHAT to start.`,
  { parse_mode: 'Markdown', ...webAppKeyboard });
  if(ADMIN_ID) bot.sendMessage(ADMIN_ID, `💰 New VIP: ${u.name} (@${u.username}) - ${days} days - ${msg.successful_payment.total_amount} ⭐`).catch(()=>{});
});

// ===== Buttons =====
bot.on('message', async (msg) => {
  if(!msg.text) return;
  if(msg.text.startsWith('/')) return;
  const u = getUser(msg);
  const t = msg.text;

  if(t === '💬 OPEN CHAT'){
    await bot.sendMessage(msg.chat.id, `Open your WhatsApp-style chat with LethuChatBot 👇`, webAppKeyboard);
    return;
  }
  if(t === '😊 MOOD'){
    await bot.sendMessage(msg.chat.id, `How are you feeling right now, ${u.name}?`, { reply_markup: { inline_keyboard: [
      [{ text: '😁 Great', callback_data: 'mood_Great' }, { text: '🙂 Okay', callback_data: 'mood_Okay' }],
      [{ text: '😐 Meh', callback_data: 'mood_Meh' }, { text: '😞 Low', callback_data: 'mood_Low' }]
    ]}});
    return;
  }
  if(t === '🎯 GOAL'){
    await bot.sendMessage(msg.chat.id, `Send me your goal like this:\n\n🎯 Gym 3x this week\n🎯 Study 1 hour daily\n\nJust type it now.`);
    return;
  }
  if(t === '📓 JOURNAL'){
    const prompts = [
      'What made you smile today, even a little?',
      "What's one thing you're avoiding? Why?",
      'What do you need more of — rest, focus, or connection?',
      'Write 3 things you are grateful for today.',
      'What would make tomorrow 1% better?'
    ];
    const p = prompts[Math.floor(Math.random()*prompts.length)];
    await bot.sendMessage(msg.chat.id, `📓 Journal prompt:\n\n${p}\n\nJust reply with your thoughts - this is private.`);
    return;
  }
  if(t === '🎙️ VOICE'){
    if(!isVip(u)){
      await bot.sendMessage(msg.chat.id, `🎙️ Voice notes are VIP.\n\n👑 Get VIP: 50 ⭐ / week or 150 ⭐ / month\n📺 Or watch Ad in Mini App = Free VIP Day`, webAppKeyboard);
      return;
    }
    await bot.sendMessage(msg.chat.id, `🎙️ VIP Voice: Send me a voice note now - I'm listening. 🤝`);
    return;
  }
  if(t === '📊 MY PROGRESS'){
    const lastMoods = u.mood.slice(-5).map(m=>m.mood).join(' | ') || 'No moods yet';
    const goalsTxt = u.goals.length ? u.goals.map((g,i)=>`${i+1}. ${g.done?'✅':'⬜'} ${g.text}`).join('\n') : 'No goals yet';
    await bot.sendMessage(msg.chat.id,
`📊 **Your Progress - LethuChatBot**

🔥 Streak: ${u.streak} days
✅ Check-ins: ${u.checkins}
${vipLabel(u)}

😊 Recent moods: ${lastMoods}

🎯 Goals:
${goalsTxt}

Keep going ${u.name}, you're doing great!`,
    { parse_mode: 'Markdown' });
    return;
  }
  if(t === '⚙️ SETTINGS'){
    await bot.sendMessage(msg.chat.id, `⚙️ Settings for ${u.name}\n\nCheck-ins: 3x a day (08:00, 13:00, 19:00 SAST)\nStatus: ${vipLabel(u)}\n\nWant to stop check-ins? Send /stop\nWant to restart? Send /start`);
    return;
  }
  if(t.startsWith('🎯')){
    const goalText = t.replace('🎯','').trim();
    if(goalText){
      if(!isVip(u) && u.goals.length >= 1){
        await bot.sendMessage(msg.chat.id, `⚠️ Free limit: 1 goal. Go VIP for unlimited goals 👑`);
        return;
      }
      u.goals.push({ text: goalText, done:false, time: Date.now() });
      await bot.sendMessage(msg.chat.id, `🎯 Goal saved: "${goalText}"\nI'll remind you about it.`);
    }
    return;
  }
  // Default chat - supportive reply
  const low = t.toLowerCase();
  let reply = '';
  if(low.includes('sad')||low.includes('tired')||low.includes('lonely')||low.includes('stress')||low.includes('anxious')||low.includes('depress')){
    reply = `Thanks for telling me that, ${u.name}. 🫂 That sounds heavy.\n\nTry this with me:\n1. Take 3 slow breaths\n2. Tell me what's weighing most\n3. We'll pick ONE tiny step together.\n\nI'm here, no judgement. Want to open chat and talk more?`;
  } else if(low.includes('thank')){
    reply = `Anytime 🤝 That's what I'm here for, ${u.name}. You're doing better than you think just by showing up.`;
  } else if(low.includes('good')||low.includes('great')||low.includes('happy')){
    reply = `Love that for you! 😁 What's making today good? Tell me one win.`;
  } else {
    reply = `Heard you 👂 Tell me a bit more — what's on your mind about that, ${u.name}?\n\nOr tap 💬 OPEN CHAT for full WhatsApp-style chat.`;
  }
  await bot.sendMessage(msg.chat.id, reply, webAppKeyboard);
});

// Mood inline buttons
bot.on('callback_query', async (q) => {
  if(q.data && q.data.startsWith('mood_')){
    const mood = q.data.replace('mood_','');
    const msg = q.message;
    const u = getUser({ chat: { id: msg.chat.id }, from: q.from });
    u.mood.push({ mood, time: Date.now() });
    u.streak++;
    await bot.answerCallbackQuery(q.id, { text: `Mood logged: ${mood}` }).catch(()=>{});
    await bot.sendMessage(msg.chat.id, `Mood logged: ${mood} 🔥 Streak: ${u.streak} days.`);
  }
});

// Voice notes
bot.on('voice', async (msg) => {
  const u = getUser(msg);
  if(!isVip(u)){
    await bot.sendMessage(msg.chat.id, `🎙️ Voice notes are VIP. Get VIP 👑 50 ⭐ / week or 150 ⭐ / month, or watch Ad for Free VIP Day.`);
    return;
  }
  await bot.sendMessage(msg.chat.id, `Got your voice note 🎙️ Thanks for sending it, ${u.name}. How are you feeling after saying that out loud?`);
});

// ===== Check-ins 3x a day SAST =====
function scheduleCheckins(){
  setInterval(async () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
    const hh = now.getHours(); const mm = now.getMinutes();
    const slots = [
      { h: 8, msg: `🌅 Morning check-in, {name}! How did you sleep? How are you feeling this morning? 😊 Tap 💬 OPEN CHAT to talk.` },
      { h: 13, msg: `☀️ Midday check-in, {name}! How's your day going so far? Have you drunk water? Taken a break? Tell me one win today.` },
      { h: 19, msg: `🌙 Evening check-in, {name}. How was today, honestly? One good thing, one hard thing. I'm here to listen. 🤝` }
    ];
    for(const s of slots){
      if(hh === s.h && mm === 0){
        for(const [id, u] of users){
          if(Date.now() - u.lastCheckin < 60*60*1000) continue;
          u.lastCheckin = Date.now(); u.checkins++;
          bot.sendMessage(id, s.msg.replace('{name}', u.name), webAppKeyboard).catch(()=>{});
        }
      }
    }
  }, 60*1000);
}
scheduleCheckins();

bot.on('polling_error', (e)=> console.log('Polling error:', e.message));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`LethuChatBot running on ${PORT} - WEBAPP: ${WEBAPP_URL}`));
