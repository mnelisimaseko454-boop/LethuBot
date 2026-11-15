// ============================================
// LethuChatBot - WITH GROQ AI (Free)
// Telegram + Mini App both use same AI brain
// Group: Shaya Earn Network
// ============================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const ADMIN_ID = process.env.ADMIN_ID;
const GROQ_KEY = process.env.GROQ_API_KEY;
const GROUP_URL = 'https://t.me/ShayaEarnNetwork';
const GROUP_ID = '@ShayaEarnNetwork';

if(!TOKEN || !WEBAPP_URL){ console.log('Missing BOT_TOKEN or WEBAPP_URL'); process.exit(1); }
if(!GROQ_KEY) console.log('⚠️ No GROQ_API_KEY - AI will fallback to rules');

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.get('/',(req,res)=>res.send('LETHUCHATBOT AWAKE - GROQ AI ON'));
app.get('/health',(req,res)=>res.json({ok:true, bot:'LethuChatBot', ai: !!GROQ_KEY}));

// ===== USERS =====
const users = new Map();
const getUser = (msg) => {
  const id = msg.chat ? msg.chat.id : msg.id;
  if(!users.has(id)) users.set(id,{id, name:(msg.from?.first_name)||msg.name||'friend', username:msg.from?.username||'', mood:[], goals:[], journal:[], vipUntil:0, streak:0, checkins:0, history:[], awaiting:null, lastTopic:''});
  return users.get(id);
};
const isVip = u => Date.now() < (u.vipUntil||0);
const vipLabel = u => isVip(u) ? `👑 VIP until ${new Date(u.vipUntil).toLocaleDateString('en-ZA')}` : 'Free';

const groupKeyboard = { reply_markup:{ inline_keyboard:[
  [{text:'👥 Join Shaya Earn Network', url: GROUP_URL}],
  [{text:'✅ I Joined - Continue', callback_data:'joined_group'}],
  [{text:'💬 OPEN CHAT - LethuChatBot', web_app:{url:WEBAPP_URL}}]
]}};
const mainKeyboard = { reply_markup:{ keyboard:[
  [{text:'💬 OPEN CHAT'},{text:'😊 MOOD'}],
  [{text:'🎯 GOAL'},{text:'📓 JOURNAL'}],
  [{text:'👑 VIP'},{text:'📊 MY PROGRESS'}],
  [{text:'👥 JOIN GROUP'},{text:'⚙️ SETTINGS'}]
], resize_keyboard:true }};

// ===== GROQ AI BRAIN =====
async function askAI(u, text){
  if(!GROQ_KEY) return null;
  // Save to history
  u.history.push({role:'user', content:text});
  if(u.history.length > 12) u.history = u.history.slice(-12);

  try{
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${GROQ_KEY}`, 'Content-Type':'application/json' },
      body: JSON.stringify({
        model:'llama-3.3-70b-versatile',
        messages:[
          { role:'system', content:
`You are LethuChatBot, a warm South African check-in buddy for young people in SA. You speak simple, friendly, township-friendly English, a bit of slang is okay.

RULES - VERY IMPORTANT:
- NEVER repeat the same question twice. NEVER say "tell me a bit more" or "tell me a bit more about that".
- Be PROACTIVE: always give a tiny next step, a 3-step plan, or a clear choice A/B/C. Take initiative.
- Keep replies SHORT: max 6 lines. No long essays.
- If user says "Yes", "Make a plan", "A", "Okay" - it means YES to what you just asked. Continue, don't re-ask.
- If user is sad/tired/lonely/stressed: be supportive, give 1 breathing step + 1 tiny action, no judgement.
- If user wants to build a bot / earn / study / money: give a concrete 3-step plan with next click.
- If user wants a goal: ask WHEN (Today / This week / This month) then confirm.
- Mention Shaya Earn Network group (t.me/ShayaEarnNetwork) ONLY when talking about earning / ads / coins.
- You are NOT Meta AI, you are LethuChatBot.

User: ${u.name}. Streak: ${u.streak} days. Goals: ${u.goals.map(g=>g.text).join(', ') || 'none'}. VIP: ${isVip(u)?'yes':'no'}.`
          },
          ...u.history
        ],
        temperature:0.7,
        max_tokens:350
      })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    if(reply){
      u.history.push({role:'assistant', content:reply});
      return reply;
    }
    console.log('Groq no reply:', JSON.stringify(data).slice(0,300));
    return null;
  }catch(e){ console.log('Groq error', e.message); return null; }
}

// Fallback if AI fails / no key
function fallbackReply(u, text){
  const t = text.toLowerCase();
  if(t.includes('telegram bot')) return `Let's DO it 🤝\n\n1. @BotFather → /newbot\n2. Copy TOKEN\n3. Tell me what it should DO\n\nReply 1=Check-in, 2=Earn, 3=Game.`;
  if(t.includes('sad')||t.includes('tired')||t.includes('lonely')||t.includes('stress')) return `Thanks for being real. 🫂 Drink water, 3 slow breaths. Tell me ONE word for what's heavy and I'll turn it into a tiny step.`;
  if(t.includes('thank')) return `Anytime 🤝 Want me to check in at 7pm? Reply YES.`;
  return `Got you — "${text}". Let's make it useful:\n\nA) Make a plan\nB) Journal prompt\nC) Save as goal\n\nReply A, B or C and I'll do it.`;
}

// ===== MINI APP API - Mini App chat uses same AI =====
app.post('/api/chat', async (req,res)=>{
  try{
    const { userId, name, text } = req.body;
    if(!text) return res.json({reply:'Send me something 🙂'});
    // Create temp user for Mini App (id = telegram id if passed, else random)
    const fakeMsg = { chat:{id: userId || 'web_'+Date.now()}, from:{first_name: name||'friend'}, name: name||'friend' };
    // For Mini App, use a stable id if Telegram provides it, else use name
    const uid = userId || `web_${name||'guest'}`;
    if(!users.has(uid)) users.set(uid,{id:uid, name:name||'friend', username:'', mood:[], goals:[], journal:[], vipUntil:0, streak:0, checkins:0, history:[], awaiting:null, lastTopic:''});
    const u = users.get(uid);
    if(name) u.name = name;
    let reply = await askAI(u, text);
    if(!reply) reply = fallbackReply(u, text);
    res.json({reply});
  }catch(e){ console.log(e.message); res.json({reply:'Hmm, my brain glitched — try again 🙂'}); }
});

// ===== GROUP GATE =====
async function isInGroup(chatId){
  try{ const m = await bot.getChatMember(GROUP_ID, chatId); return ['member','administrator','creator'].includes(m.status); }catch(e){ return true; }
}
async function gateCheck(chatId, u){
  const inGroup = await isInGroup(chatId);
  if(!inGroup){
    await bot.sendMessage(chatId, `👋 Hey ${u.name}! Join my community first:\n\n👥 **Shaya Earn Network**\nWatch Ads • Earn Coins • Learn How To Withdraw\n\nJoin, then tap ✅ I Joined:`, {parse_mode:'Markdown', ...groupKeyboard});
    return false;
  }
  return true;
}

bot.onText(/\/start/, async (msg)=>{
  const u = getUser(msg);
  const ok = await gateCheck(msg.chat.id, u);
  if(!ok) return;
  await bot.sendMessage(msg.chat.id,
`Hey ${u.name}! 👋 I'm **LethuChatBot** — now with AI.

I don't just ask questions, I give you plans + next steps.

😊 Mood • 🎯 Goals • 📓 Journal • 🔥 Streaks
👥 Community: Shaya Earn Network

Tap OPEN CHAT to talk to me.`,
  {parse_mode:'Markdown', reply_markup:{ inline_keyboard:[
    [{text:'👥 Join Shaya Earn Network', url: GROUP_URL}],
    [{text:'💬 OPEN CHAT - LethuChatBot', web_app:{url:WEBAPP_URL}}]
  ]}});
  await bot.sendMessage(msg.chat.id, `Welcome back, ${u.name}! What do you want to do? ${vipLabel(u)}`, mainKeyboard);
});

bot.onText(/\/vip|👑 VIP/, async (msg)=>{
  const u = getUser(msg);
  await bot.sendMessage(msg.chat.id,
`👑 **LethuChatBot VIP** - ${vipLabel(u)}\n\nFree: 1 goal, basic check-ins\nVIP: Unlimited goals, priority check-ins\n\nWeek - 50 ⭐ | Month - 150 ⭐\n📺 Or Watch Ad in Mini App = Free VIP Day`,
  {parse_mode:'Markdown', reply_markup:{inline_keyboard:[
    [{text:'👑 VIP Week - 50 ⭐', callback_data:'vip_week'}],
    [{text:'👑 VIP Month - 150 ⭐', callback_data:'vip_month'}],
    [{text:'👥 Join Shaya Earn Network', url: GROUP_URL}]
  ]}});
});

async function sendVipInvoice(chatId, type){
  const isWeek = type==='week';
  const title = isWeek ? 'LethuChatBot VIP - Week' : 'LethuChatBot VIP - Month';
  const desc = isWeek ? 'VIP 7 days: Unlimited goals, priority check-ins.' : 'VIP 30 days: Unlimited goals, priority check-ins.';
  await bot.sendInvoice(chatId, title, desc, isWeek?'lethu_vip_week':'lethu_vip_month', '', 'XTR', [{label:title, amount: isWeek?50:150}]).catch(e=>bot.sendMessage(chatId, `⚠️ Stars checkout failed: ${e.message}`));
}
bot.on('callback_query', async (q)=>{
  if(q.data==='joined_group'){
    await bot.answerCallbackQuery(q.id,{text:'Welcome!'}).catch(()=>{});
    await bot.sendMessage(q.message.chat.id, `Welcome to Shaya Earn Network! 👥🔥\n\nYou're in. Tap 💬 OPEN CHAT.`, mainKeyboard);
  }
  if(q.data==='vip_week') await sendVipInvoice(q.message.chat.id,'week');
  if(q.data==='vip_month') await sendVipInvoice(q.message.chat.id,'month');
  if(q.data && q.data.startsWith('mood_')){
    const mood = q.data.replace('mood_','');
    const u = getUser({chat:{id:q.message.chat.id}, from:q.from});
    u.mood.push({mood, time:Date.now()}); u.streak++;
    await bot.answerCallbackQuery(q.id,{text:`Mood: ${mood}`}).catch(()=>{});
    // AI follow-up for mood
    let reply = await askAI(u, `I just logged my mood as ${mood}. What should I do next?`);
    if(!reply) reply = `Mood logged: ${mood} 🔥 Streak: ${u.streak} days. What's ONE tiny goal for today?`;
    await bot.sendMessage(q.message.chat.id, reply);
  }
});
bot.on('pre_checkout_query', async q=>{ await bot.answerPreCheckoutQuery(q.id,true).catch(()=>{}); });
bot.on('successful_payment', async msg=>{
  const u = getUser(msg);
  const days = msg.successful_payment.invoice_payload==='lethu_vip_week' ? 7 : 30;
  u.vipUntil = Date.now()+days*24*60*60*1000;
  await bot.sendMessage(msg.chat.id, `🎉 **VIP ACTIVATED!** 👑 ${days} days. Tap 💬 OPEN CHAT.`, {parse_mode:'Markdown', reply_markup:{inline_keyboard:[[{text:'💬 OPEN CHAT', web_app:{url:WEBAPP_URL}}]]}});
  if(ADMIN_ID) bot.sendMessage(ADMIN_ID, `💰 New VIP: ${u.name} - ${days} days`).catch(()=>{});
});
bot.on('web_app_data', async msg=>{
  try{
    const data = JSON.parse(msg.web_app_data.data);
    const u = getUser(msg);
    if(data.action==='mood'){ u.mood.push({mood:data.mood, time:Date.now()}); u.streak++; await bot.sendMessage(msg.chat.id, `Mood logged: ${data.mood} 🔥 Streak: ${u.streak}`); }
    if(data.action==='goal'){ u.goals.push({text:data.text, done:false}); await bot.sendMessage(msg.chat.id, `🎯 Goal saved: "${data.text}" — I'll remind you at 8am / 1pm / 7pm.`); }
    if(data.action==='buy_vip') await sendVipInvoice(msg.chat.id, data.type||'month');
  }catch(e){ console.log(e.message); }
});

// ===== MAIN CHAT - AI FIRST =====
bot.on('message', async (msg)=>{
  if(!msg.text || msg.text.startsWith('/')) return;
  const u = getUser(msg);
  const t = msg.text;

  if(t==='👥 JOIN GROUP'){ await bot.sendMessage(msg.chat.id, `👥 Join our community — Watch Ads • Earn Coins • Learn How To Withdraw\n\n${GROUP_URL}`, {reply_markup:{inline_keyboard:[[{text:'👥 Join Shaya Earn Network', url:GROUP_URL}]]}}); return; }
  if(t==='💬 OPEN CHAT'){ await bot.sendMessage(msg.chat.id, `Open chat 👇`, {reply_markup:{inline_keyboard:[[{text:'💬 OPEN CHAT - LethuChatBot', web_app:{url:WEBAPP_URL}}]]}}); return; }
  if(t==='😊 MOOD'){ await bot.sendMessage(msg.chat.id, `How are you feeling right now?`, {reply_markup:{inline_keyboard:[[{text:'😁 Great',callback_data:'mood_Great'},{text:'🙂 Okay',callback_data:'mood_Okay'}],[{text:'😐 Meh',callback_data:'mood_Meh'},{text:'😞 Low',callback_data:'mood_Low'}]]}}); return; }
  if(t==='🎯 GOAL'){ await bot.sendMessage(msg.chat.id, `Send your goal like: 🎯 Gym 3x this week\n\nJust type it now and I'll save it.`); return; }
  if(t==='📓 JOURNAL'){
    let reply = await askAI(u, 'Give me a short journal prompt for today, then ask me to reply with my thoughts.');
    if(!reply) reply = `📓 Journal: What would make tomorrow 1% better? Reply with your thoughts.`;
    await bot.sendMessage(msg.chat.id, reply); return;
  }
  if(t==='📊 MY PROGRESS'){
    const goalsTxt = u.goals.length ? u.goals.map((g,i)=>`${i+1}. ${g.done?'✅':'⬜'} ${g.text}`).join('\n') : 'No goals yet';
    await bot.sendMessage(msg.chat.id, `📊 **Your Progress**\n\n🔥 Streak: ${u.streak} days\n✅ Check-ins: ${u.checkins}\n${vipLabel(u)}\n\n🎯 Goals:\n${goalsTxt}\n\n👥 Group: ${GROUP_URL}`, {parse_mode:'Markdown'}); return;
  }
  if(t==='⚙️ SETTINGS'){ await bot.sendMessage(msg.chat.id, `⚙️ Settings — Check-ins 08:00 / 13:00 / 19:00 SAST\nStatus: ${vipLabel(u)}\nGroup: ${GROUP_URL}`); return; }
  if(t.startsWith('🎯')){
    const goalText = t.replace('🎯','').trim();
    if(goalText){ u.goals.push({text:goalText, done:false}); await bot.sendMessage(msg.chat.id, `🎯 Goal saved: "${goalText}"\n\nWhen? Reply TODAY / THIS WEEK / THIS MONTH and I'll remind you.`); }
    return;
  }

  // AI CHAT - with typing indicator
  await bot.sendChatAction(msg.chat.id, 'typing').catch(()=>{});
  let reply = await askAI(u, t);
  if(!reply) reply = fallbackReply(u, t);
  await bot.sendMessage(msg.chat.id, reply, {reply_markup:{inline_keyboard:[[{text:'💬 OPEN CHAT', web_app:{url:WEBAPP_URL}}],[{text:'👥 Join Shaya Earn Network', url:GROUP_URL}]]}});
});

// Check-ins - AI generated, not fixed text
function scheduleCheckins(){
  setInterval(async ()=>{
    const now = new Date(new Date().toLocaleString('en-US',{timeZone:'Africa/Johannesburg'}));
    if(now.getMinutes()!==0) return;
    const slots = [
      {h:8, prompt:'Write a short morning check-in (2 lines) asking for ONE goal today. Be warm and proactive.'},
      {h:13, prompt:'Write a short midday check-in asking if their ONE goal is DONE / STUCK / SKIP, and give next step.'},
      {h:19, prompt:'Write a short evening check-in asking for 1 win + 1 hard thing today, in 1 line.'}
    ];
    for(const s of slots){
      if(now.getHours()===s.h){
        for(const [id,u] of users){
          u.checkins++;
          let msg = await askAI(u, s.prompt);
          if(!msg) msg = s.h===8 ? `🌅 Morning, ${u.name}! What's your ONE goal today?` : s.h===13 ? `☀️ Midday, ${u.name}! How's your ONE goal? DONE / STUCK / SKIP?` : `🌙 Evening, ${u.name}. 1 win + 1 hard thing today? Send in 1 line.`;
          bot.sendMessage(id, msg, {reply_markup:{inline_keyboard:[[{text:'💬 OPEN CHAT', web_app:{url:WEBAPP_URL}}]]}}).catch(()=>{});
        }
      }
    }
  },60*1000);
}
scheduleCheckins();
bot.on('polling_error', e=>console.log(e.message));
const PORT = process.env.PORT||3000;
app.listen(PORT, ()=>console.log(`LethuChatBot + GROQ AI running on ${PORT}`));
