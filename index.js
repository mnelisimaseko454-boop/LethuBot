// LethuChatBot - PROACTIVE + Shaya Earn Network Group
require('dotenv').config();
const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const ADMIN_ID = process.env.ADMIN_ID;
const GROUP_URL = 'https://t.me/ShayaEarnNetwork';
const GROUP_ID = '@ShayaEarnNetwork'; // for membership check

if(!TOKEN || !WEBAPP_URL){ console.log('Missing BOT_TOKEN or WEBAPP_URL'); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.get('/',(req,res)=>res.send('LETHUCHATBOT AWAKE'));
app.get('/health',(req,res)=>res.json({ok:true,bot:'LethuChatBot'}));

const users = new Map();
const getUser = (msg) => {
  const id = msg.chat.id;
  if(!users.has(id)) users.set(id,{id,name:msg.from.first_name||'friend',username:msg.from.username||'',mood:[],goals:[],journal:[],vipUntil:0,streak:0,checkins:0,lastTopic:'',lastBotReply:'',topicCount:0});
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

async function isInGroup(chatId){
  try{
    const m = await bot.getChatMember(GROUP_ID, chatId);
    return ['member','administrator','creator'].includes(m.status);
  }catch(e){ return true; } // if check fails, don't block user
}
async function gateCheck(chatId, u){
  const inGroup = await isInGroup(chatId);
  if(!inGroup){
    await bot.sendMessage(chatId,
`👋 Hey ${u.name}! Before we start — join my community:

👥 **Shaya Earn Network**
Watch Ads • Earn Coins • Learn How To Withdraw
Real Community • Real Earnings • 24/7 Support

Join here, then tap ✅ I Joined:`,
    {parse_mode:'Markdown', ...groupKeyboard});
    return false;
  }
  return true;
}

// ===== PROACTIVE BRAIN - NO REPEATS =====
function proactiveReply(u, text){
  const t = text.toLowerCase();
  // Avoid repeating last reply
  const pick = (arr) => {
    const filtered = arr.filter(x=>x!==u.lastBotReply);
    const r = filtered[Math.floor(Math.random()*filtered.length)] || arr[0];
    u.lastBotReply = r; return r;
  };

  // Detect topic change
  if(t!==u.lastTopic) { u.lastTopic=t; u.topicCount=0; } else { u.topicCount++; }

  // 1. CREATE BOT / TECH - TAKE INITIATIVE, DON'T ASK "tell me more"
  if(t.includes('telegram bot')||t.includes('create a bot')||t.includes('make a bot')||t.includes('bot')){
    return `Okay let's DO it, not just talk about it 🤝\n\nYou want to create a Telegram bot — here's your 3-step plan:\n\n**Step 1:** Open @BotFather → Send /newbot → Give it a name like LethuChatBot\n**Step 2:** Copy the TOKEN BotFather gives you\n**Step 3:** Tell me the token OR tell me what you want the bot to DO\n\nSo — what should YOUR bot do?\n1️⃣ Check-in / motivation bot like me\n2️⃣ Earn / Watch Ads bot\n3️⃣ Game / Crash bot\n\nReply with 1, 2 or 3 and I'll build the plan for you right now.`;
  }
  if(t==='1'||t.includes('check-in')||t.includes('motivation')){
    return `Perfect — 1️⃣ Check-in bot. Let's start building it NOW:\n\n✅ Name: Pick one — e.g. LethuChatBot\n✅ Features: Mood + Goals + Journal + 3x daily check-ins\n✅ Next: Do you have a Render account? Reply YES or NO and I'll walk you through the next click.`;
  }
  if(t==='2'||t.includes('earn')||t.includes('ads')||t.includes('coins')){
    return `Nice — 2️⃣ Earn bot. Here's how Shaya bots work:\n\n👥 Users join Shaya Earn Network\n📺 They watch ads → earn coins\n💰 They withdraw via your group\n\nWant me to show you the Earn bot structure? Reply YES and I'll give you the exact buttons + VIP prices to use. Also join our group for examples: ${GROUP_URL}`;
  }
  if(t==='3'||t.includes('game')||t.includes('crash')||t.includes('jet')){
    return `Okay 3️⃣ Game bot — let's pick one:\n\n🎯 Crash / JetX style\n🎰 Slots / Dice\n❓ Quiz / Trivia\n\nWhich one? Reply CRASH, SLOTS or QUIZ and I'll give you the game logic + how to monetize it with ads + Stars.`;
  }

  // 2. FEELINGS - GIVE ACTION, NOT JUST QUESTION
  if(t.includes('sad')||t.includes('tired')||t.includes('lonely')||t.includes('stress')||t.includes('anxious')||t.includes('depress')||t.includes('nothing')||t==='nothing'){
    return pick([
      `Thanks for being real with me. 🫂 Let's not just sit in it — do this with me RIGHT NOW:\n\n1. Stand up, drink water\n2. Put your phone down for 60 secs, breathe\n3. Tell me ONE thing that's heavy — just one word is fine.\n\nI'll help you break it into a tiny step. What's the one word?`,
      `I hear you. When you say "nothing" it usually means a lot. Let's try different:\n\nOn a scale 1-10, how heavy is today? Just send the number. I'll take it from there — no long typing needed.`,
      `Okay, I'm taking the lead here. No more "tell me more".\n\nHere's your mini-reset for the next 5 mins:\n✅ Water\n✅ 3 deep breaths\n✅ Write 1 goal for tomorrow\n\nWant me to set that goal for you? Just tell me it.`
    ]);
  }
  if(/^[0-9]$/.test(t.trim()) || t.includes('/10') || t.includes('scale')){
    return `Thanks — ${t} noted. That's helpful.\n\nIf it's low (1-4): Let's do one tiny win. Pick one: 🚶 Walk 5 mins, 📓 Journal 2 lines, or 🎯 Set 1 goal.\nIf it's high (7-10): Nice! Tell me what made it good — I want to help you repeat it tomorrow.\n\nWhich one are you picking?`;
  }

  // 3. GOALS
  if(t.includes('goal')||t.includes('gym')||t.includes('study')||t.includes('money')||t.includes('work')){
    return `Got it — let's turn that into a real goal, not just a thought.\n\n🎯 Your goal: "${text}"\n📅 When do you want it done? Today / This week / This month?\n\nReply with the time, and I'll save it + remind you at 8am, 1pm, 7pm.`;
  }
  if(t.includes('thank')) return `Anytime 🤝 You showed up, that's the hard part. Want me to check in on you again at 7pm tonight? Reply YES and I'll do it.`;
  if(t.includes('good')||t.includes('great')||t.includes('happy')||t.includes('better')){
    return `Love that! 😁 Let's lock it in — what made it good? Tell me 1 win and I'll save it to your Progress so you can look back when days are hard.`;
  }
  if(t.includes('hi')||t.includes('hello')||t.includes('hey')||t.includes('yo')){
    return `Hey ${u.name}! 👋 Good to see you. Quick check — how are you feeling RIGHT NOW?\n\n😁 Great | 🙂 Okay | 😐 Meh | 😞 Low\n\nJust send the emoji or word, I'll take it from there.`;
  }

  // 4. DEFAULT - PROACTIVE, NEVER "tell me a bit more"
  return pick([
    `Okay — "${text}" — I want to help with that properly.\n\nLet's break it down:\n1. What's the MAIN problem in one sentence?\n2. What's the outcome you want?\n\nGive me #1 and I'll give you a step-by-step plan, not just questions.`,
    `Got you. Instead of asking you the same thing, here's what I suggest for "${text}":\n\n✅ Step 1: Do the smallest version in the next 10 mins\n✅ Step 2: Tell me how it went\n✅ Step 3: We'll adjust\n\nWhat's the smallest version you could do now?`,
    `Interesting — "${text}". Let's make it useful.\n\nDo you want me to:\nA) Make a plan for it\nB) Give you a journal prompt about it\nC) Save it as a goal\n\nReply A, B or C and I'll do it now.`
  ]);
}

bot.onText(/\/start/, async (msg)=>{
  const u = getUser(msg);
  const ok = await gateCheck(msg.chat.id, u);
  if(!ok) return;
  await bot.sendMessage(msg.chat.id,
`Hey ${u.name}! 👋 I'm **LethuChatBot**.

Your proactive check-in buddy — I don't just ask questions, I give you plans + next steps.

😊 Mood • 🎯 Goals • 📓 Journal • 🔥 Streaks
👥 Community: Shaya Earn Network

Tap OPEN CHAT for WhatsApp-style chat.`,
  {parse_mode:'Markdown', reply_markup:{ inline_keyboard:[
    [{text:'👥 Join Shaya Earn Network', url: GROUP_URL}],
    [{text:'💬 OPEN CHAT - LethuChatBot', web_app:{url:WEBAPP_URL}}]
  ]}});
  await bot.sendMessage(msg.chat.id, `Welcome back, ${u.name}! What do you want to do? ${vipLabel(u)}`, mainKeyboard);
});

bot.on('callback_query', async (q)=>{
  if(q.data==='joined_group'){
    await bot.answerCallbackQuery(q.id,{text:'Welcome to the family!'}).catch(()=>{});
    await bot.sendMessage(q.message.chat.id, `Welcome to Shaya Earn Network! 👥🔥\n\nYou're in. Now let's get you going — tap 💬 OPEN CHAT.`, mainKeyboard);
  }
  if(q.data==='vip_week') await sendVipInvoice(q.message.chat.id,'week');
  if(q.data==='vip_month') await sendVipInvoice(q.message.chat.id,'month');
  if(q.data && q.data.startsWith('mood_')){
    const mood = q.data.replace('mood_','');
    const u = getUser({chat:{id:q.message.chat.id}, from:q.from});
    u.mood.push({mood, time:Date.now()}); u.streak++;
    await bot.answerCallbackQuery(q.id,{text:`Mood: ${mood}`}).catch(()=>{});
    await bot.sendMessage(q.message.chat.id, `Mood logged: ${mood} 🔥 Streak: ${u.streak} days.\n\nNext step: Want me to set 1 tiny goal for today? Reply YES and I'll help you pick one.`);
  }
});

async function sendVipInvoice(chatId, type){
  const isWeek = type==='week';
  const title = isWeek ? 'LethuChatBot VIP - Week' : 'LethuChatBot VIP - Month';
  const desc = isWeek ? 'VIP 7 days: Unlimited goals, priority check-ins.' : 'VIP 30 days: Unlimited goals, priority check-ins.';
  const payload = isWeek ? 'lethu_vip_week' : 'lethu_vip_month';
  await bot.sendInvoice(chatId, title, desc, payload, '', 'XTR', [{label:title, amount: isWeek?50:150}]).catch(e=>bot.sendMessage(chatId, `⚠️ Stars checkout failed: ${e.message}`));
}
bot.onText(/\/vip|👑 VIP/, async (msg)=>{
  const u = getUser(msg);
  await bot.sendMessage(msg.chat.id,
`👑 **LethuChatBot VIP** - ${vipLabel(u)}

Free: 1 goal, basic check-ins
VIP: Unlimited goals, priority check-ins

Week - 50 ⭐ | Month - 150 ⭐
📺 Or Watch Ad in Mini App = Free VIP Day`,
  {parse_mode:'Markdown', reply_markup:{inline_keyboard:[
    [{text:'👑 VIP Week - 50 ⭐', callback_data:'vip_week'}],
    [{text:'👑 VIP Month - 150 ⭐', callback_data:'vip_month'}],
    [{text:'👥 Join Shaya Earn Network', url: GROUP_URL}]
  ]}});
});
bot.on('pre_checkout_query', async q=>{ await bot.answerPreCheckoutQuery(q.id,true).catch(()=>{}); });
bot.on('successful_payment', async msg=>{
  const u = getUser(msg);
  const days = msg.successful_payment.invoice_payload==='lethu_vip_week' ? 7 : 30;
  u.vipUntil = Date.now()+days*24*60*60*1000;
  await bot.sendMessage(msg.chat.id, `🎉 **VIP ACTIVATED!** 👑 ${days} days. Tap 💬 OPEN CHAT to start.`, {parse_mode:'Markdown', reply_markup:{inline_keyboard:[[{text:'💬 OPEN CHAT', web_app:{url:WEBAPP_URL}}]]}});
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

bot.on('message', async (msg)=>{
  if(!msg.text || msg.text.startsWith('/')) return;
  const u = getUser(msg);
  const t = msg.text;
  if(t==='👥 JOIN GROUP'){ await bot.sendMessage(msg.chat.id, `👥 Join our community — Watch Ads • Earn Coins • Learn How To Withdraw\n\n${GROUP_URL}`, {reply_markup:{inline_keyboard:[[{text:'👥 Join Shaya Earn Network', url:GROUP_URL}]]}}); return; }
  if(t==='💬 OPEN CHAT'){ await bot.sendMessage(msg.chat.id, `Open chat 👇`, {reply_markup:{inline_keyboard:[[{text:'💬 OPEN CHAT - LethuChatBot', web_app:{url:WEBAPP_URL}}]]}}); return; }
  if(t==='😊 MOOD'){ await bot.sendMessage(msg.chat.id, `How are you feeling right now?`, {reply_markup:{inline_keyboard:[[{text:'😁 Great',callback_data:'mood_Great'},{text:'🙂 Okay',callback_data:'mood_Okay'}],[{text:'😐 Meh',callback_data:'mood_Meh'},{text:'😞 Low',callback_data:'mood_Low'}]]}}); return; }
  if(t==='🎯 GOAL'){ await bot.sendMessage(msg.chat.id, `Send your goal like: 🎯 Gym 3x this week\n\nJust type it now and I'll save it + remind you.`); return; }
  if(t==='📓 JOURNAL'){
    const prompts=['What made you smile today, even a little?','What would make tomorrow 1% better?','What do you need more of — rest, focus, or connection?'];
    await bot.sendMessage(msg.chat.id, `📓 Journal prompt:\n\n${prompts[Math.floor(Math.random()*prompts.length)]}\n\nReply with your thoughts — I'll give you a next step, not just "tell me more".`); return;
  }
  if(t==='📊 MY PROGRESS'){
    const goalsTxt = u.goals.length ? u.goals.map((g,i)=>`${i+1}. ${g.done?'✅':'⬜'} ${g.text}`).join('\n') : 'No goals yet';
    await bot.sendMessage(msg.chat.id, `📊 **Your Progress**\n\n🔥 Streak: ${u.streak} days\n✅ Check-ins: ${u.checkins}\n${vipLabel(u)}\n\n🎯 Goals:\n${goalsTxt}\n\n👥 Group: ${GROUP_URL}`, {parse_mode:'Markdown'}); return;
  }
  if(t==='⚙️ SETTINGS'){ await bot.sendMessage(msg.chat.id, `⚙️ Settings — Check-ins 08:00 / 13:00 / 19:00 SAST\nStatus: ${vipLabel(u)}\nGroup: ${GROUP_URL}`); return; }
  if(t.startsWith('🎯')){
    const goalText = t.replace('🎯','').trim();
    if(goalText){ u.goals.push({text:goalText, done:false}); await bot.sendMessage(msg.chat.id, `🎯 Goal saved: "${goalText}"\n\nNext: When do you want it done? Reply TODAY / THIS WEEK / THIS MONTH and I'll remind you.`); }
    return;
  }
  // PROACTIVE DEFAULT - NO LOOP
  const reply = proactiveReply(u, t);
  await bot.sendMessage(msg.chat.id, reply, {reply_markup:{inline_keyboard:[[{text:'💬 OPEN CHAT', web_app:{url:WEBAPP_URL}}],[{text:'👥 Join Shaya Earn Network', url:GROUP_URL}]]}});
});

// Check-ins - proactive, gives action
function scheduleCheckins(){
  setInterval(async ()=>{
    const now = new Date(new Date().toLocaleString('en-US',{timeZone:'Africa/Johannesburg'}));
    if(now.getMinutes()!==0) return;
    const slots=[
      {h:8, msg:(n)=>`🌅 Morning, ${n}! Quick action for today:\n\n1. Drink water\n2. Tell me ONE goal for today\n3. I'll remind you at 1pm\n\nWhat's your ONE goal?`},
      {h:13, msg:(n)=>`☀️ Midday, ${n}! How's your ONE goal going?\n\nReply DONE ✅ / STUCK 🆘 / SKIP ⏭️ — and I'll give you the next step, not just ask again.`},
      {h:19, msg:(n)=>`🌙 Evening, ${n}. Let's close today:\n\n1 win today? 1 hard thing?\nSend me both in 1 line — e.g. "Win: gym, Hard: tired"\n\nI'll save it + give you tomorrow's plan.`}
    ];
    for(const s of slots){
      if(now.getHours()===s.h){
        for(const [id,u] of users){
          u.checkins++;
          bot.sendMessage(id, s.msg(u.name), {reply_markup:{inline_keyboard:[[{text:'💬 OPEN CHAT', web_app:{url:WEBAPP_URL}}]]}}).catch(()=>{});
        }
      }
    }
  },60*1000);
}
scheduleCheckins();
bot.on('polling_error', e=>console.log(e.message));
const PORT = process.env.PORT||3000;
app.listen(PORT, ()=>console.log(`LethuChatBot running on ${PORT}`));
