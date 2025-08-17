/********************************************************************************************
 *                                   DISCORD GAMBLING BOT                                   *
 *   نسخة جديدة مُحسنة بكامل التعديلات المطلوبة، مع MongoDB ونظام موحد للألعاب والرهانات   *
 ********************************************************************************************/

/******************************************
 * 1)         المتغيّرات العامة          *
 ******************************************/
const { Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,  ModalBuilder,  TextInputBuilder,TextInputStyle,AttachmentBuilder,StringSelectMenuOptionBuilder
 } = require("discord.js");
const { MongoClient } = require("mongodb");
const mongoose = require('mongoose');
const dotenv = require("dotenv");
dotenv.config();
const activeGames = {};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
require('dotenv').config();

// ✅ تسجيل خط Cairo لاستخدامه في جميع الألعاب
const { GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

GlobalFonts.registerFromPath(
  path.join(__dirname, "assets/fonts/Cairo.ttf"),
  "Cairo"
);

/******************************************
 * 2)        الاتصال بـ MongoDB          *
 ******************************************/
const mongoUrl = "mongodb+srv://Nael:i8VFiKISASCUzX5O@discordbot.wzwjonu.mongodb.net/?retryWrites=true&w=majority&appName=DiscordBot";
const mongoClient = new MongoClient(mongoUrl);
let db;

async function connectToMongo() {
  try {
    await mongoClient.connect();
    db = mongoClient.db("discord_casino");
    console.log("✅ MongoDB Connected!");


  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}
connectToMongo();


mongoose.connect('mongodb+srv://Nael:i8VFiKISASCUzX5O@discordbot.wzwjonu.mongodb.net/discord_casino?retryWrites=true&w=majority&appName=DiscordBot')
  .then(() => console.log('✅ Mongoose Connected!'))
  .catch((err) => console.error('❌ Mongoose Connection Error:', err));




client.login(process.env.TOKEN);


const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(3000, () => {
  console.log('🌐 Web server running on port 3000');
});



// =====[ استيرادات ]=====
const handleMinigamesCommand = require("./commands/minigames");           // قائمة الميني قيمز (يفتح من أمر "ميني")
const handleMinigameInteraction = require("./events/interactionHandler"); // معالج اختيارات الميني قيمز

const handleShopCommand = require("./commands/shop");       // أمر "المتجر"
const handleShopInteraction = require("./shop");   // تفاعلات المتجر

// لعبة حرف (داخل مجلد games)
const harfModule = require("./games/harf");
const startHarfGame = harfModule.startHarfGame || harfModule; // يدعم حالتي التصدير (دالة أو كائن)
const showHarfLobby = harfModule.showHarfLobby || (async () => {});
const handleHarfLobbyInteraction = harfModule.handleHarfLobbyInteraction || (async () => {});
const handleHarfInteraction = harfModule.handleHarfInteraction || (async () => {});
const handleHarfModal = harfModule.handleHarfModal || (async () => {});

// =====[ أوامر الرسائل ]=====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const cmd = message.content.trim();

  // 🏪 المتجر
  if (cmd === "المتجر") {
    return handleShopCommand(message);
  }

  // 🎮 "ميني" → افتح قائمة الميني قيمز
  if (cmd === "ميني") {
    return handleMinigamesCommand(message);
  }

  // 🔤 "حرف" → افتح لوبي لعبة حرف
  if (cmd === "حرف") {
    try {
      await startHarfGame(message.channel.id);   // تهيئة الحالة
      return showHarfLobby(message.channel);     // عرض اللوبي
    } catch (e) {
      console.error("حرف start error:", e);
      return message.reply("❌ ما قدرت أبدأ لعبة حرف.");
    }
  }
});

// =====[ توجيه التفاعلات ]=====
client.on("interactionCreate", async (interaction) => {
  try {
    // 🎮 الميني قيمز أولاً (عشان ما تتبلع بالمتجر)
    if (interaction.isStringSelectMenu() && interaction.customId === "minigame_menu") {
      return handleMinigameInteraction(interaction, db);
    }
    if (interaction.isButton() && interaction.customId === "minigame_stats") {
      return handleMinigameInteraction(interaction, db);
    }

    // 🔤 لعبة حرف
    // - أزرار اللوبي: harf_join / harf_leave / harf_start
    // - أزرار اللعب: harf_play_* / harf_quit / ... إلخ
    if (interaction.isButton() && interaction.customId.startsWith("harf_")) {
      // الملف سيتجاهل الحدث غير الخاص بمرحلته (لوبي/لعب)
      await handleHarfLobbyInteraction(interaction); // يعمل فقط لو state = lobby
      return handleHarfInteraction(interaction);     // يعمل فقط لو state = playing
    }
    if (interaction.isModalSubmit() && interaction.customId === "harf_submit_modal") {
      return handleHarfModal(interaction); // في حال لعبتك تستخدم مودال إدخال كلمة
    }

    // 🛍️ المتجر (لا تبعث كل القوائم للمتجر—فقط حقه)
    if (interaction.isStringSelectMenu()) {
      const id = interaction.customId;
      if (id === "shop_section_select" || id === "punishments_menu") {
        return handleShopInteraction(interaction, db);
      }
      // غير كذا تجاهل (لأن ممكن يكون مكوّن لشيء ثاني مستقبلاً)
      return;
    }

    if (
      interaction.isButton() &&
      [
        "shop_back",
        "confirm_roles_purchase",
        "confirm_mention_jail",
        "confirm_mention_bail",
        "confirm_visit",
        "confirm_timeout",
        "confirm_mute",
        "confirm_steal"
      ].includes(interaction.customId)
    ) {
      return handleShopInteraction(interaction, db);
    }

    // ... أي تفاعلات أخرى تخص نظامك تضيفها تحت
  } catch (err) {
    console.error("interactionCreate error:", err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "حدث خطأ غير متوقع.", ephemeral: true });
      }
    } catch {}
  }
});

/******************************************
 * 3)        نظام المحفظة الجديد         *
 ******************************************/
async function getBalance(userId) {
  const user = await db.collection("users").findOne({ userId: String(userId) });

  if (!user) {
    // إنشاء محفظة جديدة تلقائيًا
    const newUser = {
      userId: String(userId),
      wallet: 1000,
      stats: { createdAt: new Date() }
    };
    await db.collection("users").insertOne(newUser);
    return 1000;
  }

  return user.wallet || 0;
}

async function addBalance(userId, amount) {
  await db.collection("users").updateOne(
    { userId: String(userId) },
    { $inc: { wallet: amount } },
    { upsert: true }
  );
}

async function setBalance(userId, amount) {
  await db.collection("users").updateOne(
    { userId: String(userId) },
    { $set: { wallet: amount } },
    { upsert: true }
  );
}

async function subtractBalance(userId, amount) {
  await db.collection("users").updateOne(
    { userId: String(userId) },
    { $inc: { wallet: -Math.abs(amount) } },
    { upsert: true }
  );
}

// 📦 دوال المتجر - ضيفها بجانب دوال الاقتصاد

async function getShopItems(section) {
  return await db.collection("shop_items").find({ section }).toArray();
}

async function getUserInventory(userId) {
  const user = await db.collection("user_items").findOne({ userId });
  return user?.items || {};
}

async function canBuyItem(userId, item) {
  const balance = await getBalance(userId);
  if (balance < item.price) return { ok: false, reason: "❌ رصيدك لا يكفي." };
  if (item.stock <= 0) return { ok: false, reason: "❌ الغرض غير متوفر حالياً." };

  const inventory = await getUserInventory(userId);
  const owned = inventory[item.itemId] || 0;
  if (owned >= item.maxPerUser) return { ok: false, reason: "❌ لا يمكنك شراء أكثر من نسخة." };

  return { ok: true };
}

async function buyItem(userId, item) {
  await subtractBalance(userId, item.price);
  await db.collection("shop_items").updateOne({ itemId: item.itemId }, { $inc: { stock: -1 } });
  await db.collection("user_items").updateOne(
    { userId },
    { $inc: { [`items.${item.itemId}`]: 1 } },
    { upsert: true }
  );
}

// التعديل على الدالة نفسها
async function updateBalanceWithLog(db, userId, amount, reason) {
  const users = db.collection('users');
  const transactions = db.collection('transactions');

  await users.updateOne(
    { userId },
    { $inc: { balance: amount } },
    { upsert: true }
  );

  await transactions.insertOne({
    userId,
    amount,
    reason,
    timestamp: new Date()
  });
}

// 📑 أمر كشف الحساب (مع تصميم Embed مرتب)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "كشف") {
    const userId = message.author.id;
    const transactions = db.collection("transactions");

    const docs = await transactions
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    if (!docs.length) {
      return message.reply("📭 لا يوجد أي عمليات مسجلة لحسابك.");
    }

    const { EmbedBuilder } = require("discord.js");

    const embed = new EmbedBuilder()
      .setTitle("📋 كشف العمليات الأخيرة")
      .setColor("Green");

    docs.forEach((tx, i) => {
      const date = new Date(tx.timestamp);
      const formattedDate = `<t:${Math.floor(date.getTime() / 1000)}:f>`; // يعرضها بشكل حلو بديسكورد

      embed.addFields({
        name: `**${i + 1} - ${tx.reason || "عملية"}**`,
        value: `💰 ${tx.amount > 0 ? `+${tx.amount}` : tx.amount} ريال\n🗓️ ${formattedDate} \n💵`,
        inline: false
      });
    });

    message.reply({ embeds: [embed] });
  }
});


/******************************************
 * نظام تحديد مبلغ الرهان الموحد والمحسن     *
 ******************************************/

const soloGamesMap = {
  soloroulette: "startSoloRoulette",
  soloslot: "startSlotMachine",
  solomystery: "startSoloMystery",
  solocard: "startSoloBus",
  soloblackjack: "startBlackjackSolo",
  solobuckshot: "startBuckshotSolo",
};

const soloGameFunctions = {
  startSoloRoulette,
  startSlotMachine,
  startSoloMystery,
  startSoloBus,
  startBlackjackSolo,
  startBuckshotSolo,
};

client.on("interactionCreate", async (i) => {
  if (i.isStringSelectMenu() && i.customId === "select_solo_game") {
    const gameId = i.values[0];
    const bal = await getBalance(i.user.id);
    await showBetInterface(i, i.user.id, gameId, bal, 1000);
    return;
  }

  // 📌 زر "💬 مخصص"
  if (i.isButton() && i.customId.startsWith("bet_custom_")) {
    const [, , userId, gameId] = i.customId.split("_");
    if (i.user.id !== userId) return i.reply({ content: "❌ هذا الزر ليس لك!", ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId(`customamount_${userId}_${gameId}`)
      .setTitle("💬 إدخال مبلغ مخصص")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("custom_amount_input")
            .setLabel("كم المبلغ اللي تبغى تراهن فيه؟")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    return i.showModal(modal);
  }

  // 📌 نتيجة المودال بعد إدخال المبلغ
  if (i.isModalSubmit() && i.customId.startsWith("customamount_")) {
    const [, userId, gameId] = i.customId.split("_");

    if (i.user.id !== userId) {
      return i.reply({ content: "❌ هذا المودال ليس لك!", ephemeral: true });
    }

    const amountStr = i.fields.getTextInputValue("custom_amount_input");
    const amount = parseInt(amountStr);
    const bal = await getBalance(userId);

    if (isNaN(amount) || amount <= 0) {
      return i.reply({ content: "❌ المبلغ غير صالح.", ephemeral: true });
    }

    if (amount > bal) {
      return i.reply({ content: "❌ ما عندك رصيد كافي!", ephemeral: true });
    }

    // 🛠 تحديث نفس الرسالة بعد المودال
    return showBetInterface(i, userId, gameId, bal, amount, true);
  }

  // 📌 تعديل المبلغ
  if (i.isButton() && i.customId.startsWith("bet_add_")) {
    const [, , amtStr, userId, gameId, current] = i.customId.split("_");
    if (i.user.id !== userId) return i.reply({ content: "❌ هذا الزر ليس لك!", ephemeral: true });

    const newAmount = parseInt(current) + parseInt(amtStr);
    const bal = await getBalance(userId);
    return showBetInterface(i, userId, gameId, bal, newAmount);
  }

  // 📌 تأكيد الرهان
  if (i.isButton() && i.customId.startsWith("bet_confirm_")) {
    const [, , userId, gameId, amtStr] = i.customId.split("_");
    if (i.user.id !== userId) return i.reply({ content: "❌ ليس لك!", ephemeral: true });

    const bet = parseInt(amtStr);
    const bal = await getBalance(userId);
    if (bet > bal || isNaN(bet)) return i.reply({ content: "❌ رصيدك لا يكفي أو هناك خطأ في الرهان", ephemeral: true });

    const userDoc = await db.collection("users").findOne({ userId });
    if (!userDoc) return i.reply({ content: "❌ لا تملك محفظة بعد، استخدم أمر `رصيدي` لإنشائها.", ephemeral: true });

    await db.collection("users").updateOne({ userId }, { $inc: { wallet: -bet } });

    const fnName = soloGamesMap[gameId];
    const gameFunction = soloGameFunctions[fnName];
    console.log("📦 gameId:", gameId);
    console.log("🎯 fnName from soloGamesMap:", fnName);
    console.log("📌 function exists?", typeof gameFunction === "function");

    await i.deferUpdate();

    setTimeout(() => {
      i.message.delete().catch(() => {});
    }, 1000);

    if (typeof gameFunction === "function") {
      return gameFunction(i, bet);
    } else {
      return i.channel.send("❌ لم يتم العثور على اللعبة.");
    }
  }

  // 📌 إلغاء الرهان
  if (i.isButton() && i.customId === "bet_cancel") {
    return i.update({ content: "❌ تم إلغاء الرهان.", embeds: [], components: [] });
  }
});

async function showBetInterface(inter, userId, gameId, balance, amount = 1000, forceUpdate = false) {
  const embed = new EmbedBuilder()
    .setColor("#00b894")
    .setTitle("💰 تحديد مبلغ الرهان")
    .setDescription(`**مبلغ الرهان الحالي:** ${amount.toLocaleString()} كاش 💸\n**رصيدك:** ${balance.toLocaleString()} 💳`)
    .setThumbnail(inter.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: "اضغط تأكيد للبدء" })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bet_add_50_${userId}_${gameId}_${amount}`).setLabel("+50").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`bet_add_100_${userId}_${gameId}_${amount}`).setLabel("+100").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`bet_add_500_${userId}_${gameId}_${amount}`).setLabel("+500").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`bet_custom_${userId}_${gameId}`).setLabel("💬 مخصص").setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bet_confirm_${userId}_${gameId}_${amount}`).setLabel("✅ تأكيد").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`bet_cancel`).setLabel("❌ إلغاء").setStyle(ButtonStyle.Danger)
  );

  const payload = { embeds: [embed], components: [row1, row2] };

  if (inter.isButton() || forceUpdate) {
    await inter.update(payload);
  } else if (!inter.replied && !inter.deferred) {
    await inter.reply(payload);
  } else {
    await inter.editReply(payload);
  }
}

//** ✅ دالة التحديث الموحد لإحصائيات الألعاب الفردية////////////////////////////////////////

async function updateSoloStats(userId, gameId, bet, didWin, earned) {
  const net = earned - bet;
  const gameKey = `stats.${gameId}`;

  const update = {
    $set: {
      [`${gameKey}.lastPlayed`]: new Date()
    },
    $inc: {
      [`${gameKey}.totalGames`]: 1,
      [`${gameKey}.net`]: net,
      [`${gameKey}.${didWin ? "wins" : "loses"}`]: 1
    }
  };

  await db.collection("solostats").updateOne(
    { userId },
    update,
    { upsert: true }
  );
}


// ✅ دالة عرض الإحصائيات بنفس تنسيق الصورة
async function getSoloStatsEmbed(interaction, filterGameId = "all") {
  const userId = interaction.user.id;
  const doc = await db.collection("solostats").findOne({ userId });

  if (!doc || !doc.stats || Object.keys(doc.stats).length === 0) {
    return new EmbedBuilder()
      .setTitle("📊 إحصائياتك")
      .setDescription("لا توجد بيانات لعرضها.")
      .setColor("Orange");
  }

  const embed = new EmbedBuilder()
    .setTitle("📊 إحصائيات الألعاب الفردية")
    .setColor("#3498db")
    .setThumbnail(interaction.user.displayAvatarURL());

  const stats = doc.stats;

  for (const [game, data] of Object.entries(stats)) {
    if (filterGameId !== "all" && filterGameId !== game) continue;

    const winRate = data.totalGames > 0 ? ((data.wins / data.totalGames) * 100).toFixed(1) : "0";
    embed.addFields({
      name: `🎮 ${game}`,
      value: `🕹️ الألعاب: **${data.totalGames}**
🏆 الفوز: **${data.wins}**
💀 الخسارة: **${data.loses}**
📈 الفوز: **${winRate}%**
💰 الصافي: **${data.net.toLocaleString()}**
🕓 آخر لعب: <t:${Math.floor(new Date(data.lastPlayed).getTime() / 1000)}:R>`,
      inline: false
    });
  }

  return embed;
}


// ✅ دالة اختيارية تعرض اسم اللعبة بشكل جميل بدل gameId
function getGameDisplayName(gameId) {
  const names = {
    soloroulette: "الروليت",
    soloslot: "ماكينة السلوت",
    solomystery: "صندوق الفوضى",
    solocard: "تحدي الورق",
    soloblackjack: "بلاك جاك",
    solobuckshot: "باكشوت"
  };
  return names[gameId] || gameId;
}


// 🟢 التصدير لو بتستخدم system modules
module.exports = {
  updateSoloStats,
  getSoloStatsEmbed
};

// 🧠 تخزين الرهانات الفردية
const activeSoloBets = {};

// 🔁 استرجاع وحذف رهان اللاعب
function getSoloBet(userId) {
  const bet = activeSoloBets[userId];
  delete activeSoloBets[userId];
  return bet || 0;
}

// 💰 معالجة نتيجة اللعبة وتحديث الرصيد والإحصائيات
async function handleSoloGameResult(interaction, gameId, didWin, multiplier = 0) {
  const userId = interaction.user.id;
  const bet = getSoloBet(userId);
  const earned = didWin ? bet * multiplier : 0;
  const net = earned - bet;

  await addBalance(userId, net);
  await updateSoloStats(interaction, gameId, bet, didWin, earned);

  return { bet, earned, net };
}



/******************************************
 * 🎰 لعبة روليت (فردية ضد الحظ) - محدثة  *
 ******************************************/
async function startSoloRoulette(interaction, bet) {
  const userId = interaction.user.id;

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const ranges = [
    { id: "0_9", label: "0 - 9", min: 0, max: 9, multiplier: 3.7 },
    { id: "10_19", label: "10 - 19", min: 10, max: 19, multiplier: 3.7 },
    { id: "20_29", label: "20 - 29", min: 20, max: 29, multiplier: 3.7 },
    { id: "30_36", label: "30 - 36", min: 30, max: 36, multiplier: 2.6 },
  ];

  const colorRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("solo_roulette_color_red").setLabel("🔴 أحمر").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("solo_roulette_color_black").setLabel("⚫ أسود").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("solo_roulette_color_green").setLabel("🟢 أخضر").setStyle(ButtonStyle.Success)
  );

  const parityRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("solo_roulette_parity_even").setLabel("زوجي").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("solo_roulette_parity_odd").setLabel("فردي").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("solo_roulette_cancel").setLabel("❌ انسحاب").setStyle(ButtonStyle.Danger)
  );

  const rangeRow = new ActionRowBuilder();
  for (const r of ranges) {
    rangeRow.addComponents(
      new ButtonBuilder().setCustomId("solo_roulette_range_" + r.id).setLabel(r.label).setStyle(ButtonStyle.Secondary)
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("🎰 روليت القمار")
    .setDescription("🎯 اختر نوع رهانك:")
    .setColor("#f1c40f");

  const sent = await interaction.channel.send({
    content: "🎰 اختر نوع الرهان من الأسفل:",
    embeds: [embed],
    components: [colorRow, rangeRow, parityRow]
  });

  const collector = sent.createMessageComponentCollector({ time: 15000 });
  let selectedType = null;
  let multiplier = 0;

  collector.on("collect", async (btn) => {
    if (btn.user.id !== userId) return;

    

    const number = Math.floor(Math.random() * 37);
    const color = number === 0 ? "green" : redNumbers.includes(number) ? "red" : "black";
    const emoji = color === "green" ? "🟢" : color === "red" ? "🔴" : "⚫";
    let won = false;

    if (btn.customId.startsWith("roulette_color_")) {
      const guess = btn.customId.split("_")[2];
      won = guess === color;
      multiplier = guess === "green" ? 14 : 2;
      selectedType = guess;
    }

    else if (btn.customId.startsWith("roulette_parity_")) {
      const guess = btn.customId.split("_")[2];
      if (guess === "even") {
        won = number !== 0 && number % 2 === 0;
      } else {
        won = number % 2 === 1;
      }
      multiplier = 2;
      selectedType = guess;
    }

    else if (btn.customId.startsWith("roulette_range_")) {
      const [min, max] = btn.customId.split("_").slice(2).map(Number);
      won = number >= min && number <= max;
      const rangeObj = ranges.find(r => r.min === min && r.max === max);
      multiplier = rangeObj?.multiplier || 3.5;
      selectedType = `${min}-${max}`;
    }

    else if (btn.customId === "roulette_cancel") {
      collector.stop();
      await sent.edit({ content: "❌ تم إلغاء الجولة.", embeds: [], components: [] });
      return;
    }

    collector.stop();

    let net = 0;
    let resultText = "";
  if (won) {
  net = bet * multiplier;
  await updateBalanceWithLog(db,userId, net, `ربح من لعبة المراهنة`);
  resultText = `🎉 فزت! ✅ الرقم: **${number} ${emoji}**\nالربح: ${net.toLocaleString()} كاش`;
} else {
  await updateBalanceWithLog(db,userId, -bet, `خسارة من لعبة المراهنة`);
  resultText = `💸 خسرت! ❌ الرقم: **${number} ${emoji}**\nالرهان: ${bet.toLocaleString()} كاش`;
}


    await updateSoloStats(userId, "soloroulette", bet, won, net);

    const resultEmbed = new EmbedBuilder()
      .setTitle("🎰 نتيجة روليت")
      .setDescription(resultText)
      .setColor(won ? 0x2ecc71 : 0xe74c3c);

    await sent.edit({ embeds: [resultEmbed], components: [] });
    setTimeout(() => sent.delete().catch(() => {}), 5000);
  });
}


/******************************************
 * 🎰 لعبة ماكينة السلوت (موحدة الرهان)   *
 ******************************************/

const slotSymbols = [
  { emoji: "🍒", name: "كرز", value: 1, weight: 25, rarity: "شائع" },
  { emoji: "🍋", name: "ليمون", value: 1, weight: 20, rarity: "شائع" },
  { emoji: "🍉", name: "بطيخ", value: 1, weight: 15, rarity: "غير شائع" },
  { emoji: "💎", name: "ألماسة", value: 25, weight: 5, rarity: "نادر" },
  { emoji: "👑", name: "تاج", value: 50, weight: 3, rarity: "أسطوري" },
  { emoji: "🎰", name: "جاكبوت", value: 100, weight: 1, rarity: "جاكبوت" },
];

function weightedRandomSymbol() {
  const totalWeight = slotSymbols.reduce((acc, s) => acc + s.weight, 0);
  let rand = Math.random() * totalWeight;
  return slotSymbols.find(s => (rand -= s.weight) < 0) || slotSymbols[0];
}

function getSlotResult(reels, bet) {
  const names = reels.map(r => r.name);
  const isFruit = (n) => ["كرز", "ليمون", "بطيخ"].includes(n);
  const isAllDifferentFruits = new Set(names).size === 3 && names.every(isFruit);
  const allSame = names.every(n => n === names[0]);
  const allFruits = names.every(isFruit);

  if (names.every(n => n === "جاكبوت")) {
    return { isWin: true, multiplier: 100, message: "🎰 **جاكبوت!** فزت بـ 100x" };
  } else if (names.every(n => n === "تاج")) {
    return { isWin: true, multiplier: 50, message: "👑 **ملكي!** فزت بـ 50x" };
  } else if (names.every(n => n === "ألماسة")) {
    return { isWin: true, multiplier: 25, message: "💎 **ألماسات!** فزت بـ 25x" };
  } else if (allSame && allFruits) {
    return { isWin: true, multiplier: 10, message: `🍒 **${names[0]} ×3!** فزت بـ 10x` };
  } else if (isAllDifferentFruits) {
    return { isWin: true, multiplier: 2, message: `🍉 **3 فواكه متنوعة!** فزت بـ 2x` };
  }

  return { isWin: false, multiplier: 0, message: "💸 خسرت! حاول مرة ثانية." };
}

// هذه الدالة تستدعي من النظام الموحد
async function startSoloSlot(interaction, bet) {
  await showSlotIntro(interaction, bet);
}


async function showSlotIntro(interaction, bet) {
  const balance = await getBalance(interaction.user.id);
  const embed = new EmbedBuilder()
    .setTitle("🎰✨ Ultra Slot Machine ✨🎰")
    .setDescription(`📌 **مبلغ الرهان:** ${bet.toLocaleString()} ريال\n💰 **رصيدك الحالي:** ${balance.toLocaleString()} ريال\n\n🎯 **شرح الجوائز:**
• 3 فواكه متنوعة = 2x 💸\n• 3 فواكه من نفس النوع = 10x 🍒\n• 3 ألماسات = 25x 💎\n• 3 تيجان = 50x 👑\n• 3 جاكبوت = 100x 🎰`)
    .setColor(0x3498db)
    .setFooter({ text: "اضغط ابدأ لبدء اللعبة أو انسحاب لاسترجاع رهانك." });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("slot_start").setLabel("ابدأ").setStyle(ButtonStyle.Success).setEmoji("🎲"),
    new ButtonBuilder().setCustomId("slot_info").setLabel("معلومات اللعبة").setStyle(ButtonStyle.Secondary).setEmoji("ℹ️"),
    new ButtonBuilder().setCustomId("slot_quit").setLabel("انسحاب").setStyle(ButtonStyle.Danger).setEmoji("❌")
  );

  await interaction.channel.send({ embeds: [embed], components: [row] });
}

async function handleSlotButtons(interaction, bet) {
  const userId = interaction.user.id;
  if (interaction.customId === "slot_info") {
    return interaction.reply({
      content: `🎰 **شرح اللعبة:**\n• 3 فواكه متنوعة = 2x\n• 3 فواكه متطابقة = 10x\n• 3 ألماسات 💎 = 25x\n• 3 تيجان 👑 = 50x\n• 3 جاكبوت 🎰 = 100x`,
      ephemeral: true,
    });
  }

  if (interaction.customId === "slot_quit") {
    await addBalance(userId, bet);
    await interaction.update({ content: `❌ تم الانسحاب من اللعبة وتم استرجاع ${bet.toLocaleString()} ريال.`, embeds: [], components: [] });
    return;
  }

  if (interaction.customId === "slot_start") {
    await startSlotMachine(interaction, bet);
  }
}

async function startSlotMachine(interaction, bet) {
  const userId = interaction.user.id;
  const balance = await getBalance(userId);

  if (bet > balance) {
    return interaction.reply({ content: "❌ ما عندك رصيد كافي!", ephemeral: true });
  }

  const reels = [weightedRandomSymbol(), weightedRandomSymbol(), weightedRandomSymbol()];
  const result = getSlotResult(reels, bet);

  const earned = result.isWin ? bet * result.multiplier : 0;
  const net = earned - bet;
  if (earned > 0) await addBalance(userId, earned);

  await updateSoloStats(userId, "soloslot", bet, result.isWin, earned);

  const symbols = reels.map(r => r.emoji).join(" | ");
  const rarities = reels.map(r => r.rarity).join(" • ");
  const finalBal = balance - bet + earned;

  const embed = new EmbedBuilder()
    .setTitle("🎰 Ultra Slot Machine 🎰")
    .setDescription(`🎰━━━━━━━━━━━━━━━━━━━🎰\n**${symbols}**\n🎰━━━━━━━━━━━━━━━━━━━🎰\n${rarities}\n\n${result.message}`)
    .setColor(result.isWin ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: result.isWin ? "🏆 الربح" : "💸 الخسارة", value: `${result.isWin ? "+" : "-"}${bet.toLocaleString()} ريال`, inline: true },
      { name: "💳 رصيدك الحالي", value: `${finalBal.toLocaleString()} ريال`, inline: true }
    )
    .setTimestamp();

  const msg = await interaction.channel.send({ embeds: [embed] });
  setTimeout(() => msg.delete().catch(() => {}), 5000);
}

/******************************************
 * 🎁 لعبة صندوق الغموض (Mystery Box)    *
 ******************************************/

const boxOptions = [
  { name: "مضاعفة ×2", emoji: "💸", type: "win", multiplier: 2, weight: 30 },
  { name: "مضاعفة ×3", emoji: "💰", type: "win", multiplier: 3, weight: 15 },
  { name: "صندوق فاضي", emoji: "📭", type: "lose", multiplier: 0, weight: 20 },
  { name: "خسارة جزئية", emoji: "🪙", type: "lose", multiplier: 0.5, weight: 15 },
  { name: "خسارة كاملة", emoji: "💀", type: "lose", multiplier: 0, weight: 10 },
  { name: "مكافأة ثابتة", emoji: "🎉", type: "bonus", amount: 1000, weight: 5 },
  { name: "تايم أوت", emoji: "⏳", type: "timeout", amount: 0, weight: 5 }
];

const boxBets = new Map();

function weightedRandomBox() {
  const totalWeight = boxOptions.reduce((a, b) => a + b.weight, 0);
  let rand = Math.random() * totalWeight;
  return boxOptions.find(b => (rand -= b.weight) < 0) || boxOptions[0];
}

async function startSoloMystery(interaction, bet) {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.deferUpdate({ ephemeral: true });
  }

  boxBets.set(interaction.user.id, bet);

  const embed = new EmbedBuilder()
    .setTitle("🎁 صندوق الغموض")
    .setDescription(`اختر أحد الصناديق الثلاثة 👇\n📦 🎁 📮`)
    .setColor(0x9b59b6)
    .setFooter({ text: "اضغط انسحاب إذا غيرت رأيك قبل فتح الصندوق." });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("box_1").setLabel("📦 صندوق 1").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("box_2").setLabel("🎁 صندوق 2").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("box_3").setLabel("📮 صندوق 3").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("box_quit").setLabel("❌ انسحاب").setStyle(ButtonStyle.Danger)
  );

  const introMessage = await interaction.channel.send({ embeds: [embed], components: [row] });
  boxBets.set(`${interaction.user.id}_messageId`, introMessage.id);
}

async function handleBoxButtons(interaction) {
  const userId = interaction.user.id;
  const bet = boxBets.get(userId);
  if (!bet) return interaction.reply({ content: "❌ لا يوجد لعبة قيد التشغيل.", ephemeral: true });

  if (interaction.customId === "box_quit") {
    await addBalance(userId, bet);
    boxBets.delete(userId);
    return interaction.update({ content: `✅ تم الانسحاب من اللعبة واسترجاع ${bet.toLocaleString()} ريال.`, embeds: [], components: [] });
  }

  if (["box_1", "box_2", "box_3"].includes(interaction.customId)) {
    await interaction.deferUpdate();

    const box = weightedRandomBox();
    boxBets.delete(userId);

    let resultMsg = "";
    let earned = 0;

    switch (box.type) {
      case "win":
        earned = bet * box.multiplier;
        resultMsg = `🎉 ${box.emoji} **${box.name}**! ربحت ${earned.toLocaleString()} ريال`;
        await addBalance(userId, earned);
        break;

      case "lose":
        earned = bet * (box.multiplier || 0);
        resultMsg = `😢 ${box.emoji} **${box.name}**! خسرت ${(bet - earned).toLocaleString()} ريال`;
        if (earned > 0) await addBalance(userId, earned);
        break;

      case "bonus":
        earned = box.amount;
        resultMsg = `🎁 ${box.emoji} **${box.name}**! حصلت على ${earned.toLocaleString()} ريال كمكافأة`;
        await addBalance(userId, earned);
        break;

      case "timeout":
        resultMsg = `⏳ ${box.emoji} **${box.name}**! ما حصلت شيء هالمرة.`;
        break;

      default:
        resultMsg = `❓ نتيجة غير معروفة.`;
    }

    await updateSoloStats(userId, "solobox", bet, earned > bet, earned);

    const embed = new EmbedBuilder()
      .setTitle("📦 نتيجة الصندوق")
      .setDescription(resultMsg)
      .setColor(earned > bet ? 0x2ecc71 : earned === 0 ? 0xe74c3c : 0xf1c40f)
      .setFooter({ text: `رهان: ${bet.toLocaleString()} ريال` })
      .setTimestamp();

    const msg = await interaction.channel.send({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 5000);

    // حذف رسالة البداية
    const introMsgId = boxBets.get(`${userId}_messageId`);
    if (introMsgId) {
      const channel = interaction.channel;
      channel.messages.fetch(introMsgId).then(m => m.delete().catch(() => {})).catch(() => {});
    }
  }
}

// 👇 هذا الجزء الجديد لازم تضيفه في ملف الأحداث الرئيسي
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId.startsWith("withdraw_")) return handleTimeRoomWithdraw(interaction);

  const customId = interaction.customId;
  if (customId.startsWith("box_")) {
    try {
      await handleBoxButtons(interaction);
    } catch (err) {
      console.error("❌ خطأ في handleBoxButtons:", err);
      if (!interaction.replied) {
        interaction.reply({ content: "حدث خطأ أثناء تنفيذ اللعبة.", ephemeral: true }).catch(() => {});
      }
    }
  }
});


// 🃏 تحدي الأوراق - Ride the Bus

const rideBusGames = new Map();

function drawUniqueCard(drawn, excludeValues = []) {
  const suits = ["♥️", "♦️", "♣️", "♠️"];
  const values = Array.from({ length: 13 }, (_, i) => i + 1);
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      if (!drawn.find(c => c.suit === suit && c.value === value) && !excludeValues.includes(value)) {
        deck.push({ suit, value });
      }
    }
  }
  return deck[Math.floor(Math.random() * deck.length)];
}

function getExpiryTimestamp(seconds) {
  return `<t:${Math.floor(Date.now() / 1000) + seconds}:R>`;
}

function deleteMessageLater(message, delay = 5000) {
  setTimeout(() => {
    message.delete().catch(() => {});
  }, delay);
}

async function startSoloBus(interaction, bet) {
  const userId = interaction.user.id;
  const drawn = [];
  const sent = await interaction.channel.send({ content: "جارٍ بدء اللعبة..." });
  rideBusGames.set(userId, { stage: 1, drawn, bet, msg: sent });

  const embed = new EmbedBuilder()
    .setTitle("🃏 الجولة الأولى")
    .setDescription(`🎯 ما هو لون البطاقة القادمة؟\n⏳ ينتهي خلال ${getExpiryTimestamp(20)}`)
    .setColor("#e74c3c");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("bus_red").setLabel("🔴 أحمر").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("bus_black").setLabel("⚫ أسود").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("bus_quit").setLabel("❌ انسحاب").setStyle(ButtonStyle.Danger)
  );

  await sent.edit({ content: " ", embeds: [embed], components: [row] });

  setTimeout(() => {
    const game = rideBusGames.get(userId);
    if (game && game.stage === 1) {
      rideBusGames.delete(userId);
      sent.edit({ content: `⏰ انتهى الوقت! خسرت الرهان.`, embeds: [], components: [] });
      deleteMessageLater(sent);
    }
  }, 20000);
}

client.on("interactionCreate", async i => {
  if (!i.isButton()) return;
  if (!i.customId.startsWith("bus_")) return;
  await i.deferUpdate();

  const userId = i.user.id;
  const game = rideBusGames.get(userId);
  if (!game) return;

  const { stage, drawn, bet, msg } = game;
  const suitEmoji = { "♥️": "♥️", "♦️": "♦️", "♣️": "♣️", "♠️": "♠️" };

  if (i.customId === "bus_quit") {
    const multipliers = { 1: 1, 2: 2, 3: 5, 4: 10 };
    const refund = bet * multipliers[stage];
    await addBalance(userId, refund);
    rideBusGames.delete(userId);
    return msg.edit({ content: `❌ انسحبت من التحدي! تم استرجاع ${refund.toLocaleString()} ريال.`, embeds: [], components: [] }).then(deleteMessageLater);
  }

  // جولة 1
  if (stage === 1 && ["bus_red", "bus_black"].includes(i.customId)) {
    const guess = i.customId === "bus_red" ? "red" : "black";
    const card = drawUniqueCard(drawn);
    drawn.push(card);
    const isRed = card.suit === "♥️" || card.suit === "♦️";
    const result = (isRed && guess === "red") || (!isRed && guess === "black");

    if (!result) {
      rideBusGames.delete(userId);
      return msg.edit({ content: `❌ البطاقة كانت ${suitEmoji[card.suit]}${card.value}، توقّعك خاطئ! خسرت الرهان.`, embeds: [], components: [] }).then(deleteMessageLater);
    }

    game.stage = 2;
    const embed = new EmbedBuilder()
      .setTitle("🃏 الجولة الثانية")
      .setDescription(`🔢 بطاقتك السابقة: ${suitEmoji[card.suit]}${card.value}\nهل تتوقع البطاقة التالية أكبر أم أصغر؟\n⏳ ينتهي خلال ${getExpiryTimestamp(20)}`)
      .setColor("#f39c12");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("bus_high").setLabel("🔼 أكبر").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("bus_low").setLabel("🔽 أصغر").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("bus_quit").setLabel("❌ انسحاب ×2").setStyle(ButtonStyle.Danger)
    );

    await msg.edit({ content: " ", embeds: [embed], components: [row] });

    setTimeout(() => {
      const game = rideBusGames.get(userId);
      if (game && game.stage === 2) {
        rideBusGames.delete(userId);
        msg.edit({ content: `⏰ انتهى الوقت! خسرت الرهان.`, embeds: [], components: [] });
        deleteMessageLater(msg);
      }
    }, 20000);
  }

  // جولة 2
  if (stage === 2 && ["bus_high", "bus_low"].includes(i.customId)) {
    const prev = drawn[0];
    const card = drawUniqueCard(drawn, [prev.value]);
    drawn.push(card);
    const result = i.customId === "bus_high" ? card.value > prev.value : card.value < prev.value;

    if (!result) {
      rideBusGames.delete(userId);
      return msg.edit({ content: `❌ البطاقة كانت ${suitEmoji[card.suit]}${card.value}، توقّعك خاطئ! خسرت الرهان.`, embeds: [], components: [] }).then(deleteMessageLater);
    }

    game.stage = 3;
    const embed = new EmbedBuilder()
      .setTitle("🃏 الجولة الثالثة")
      .setDescription(`🎯 بطاقتك السابقة: ${suitEmoji[drawn[0].suit]}${drawn[0].value} و ${suitEmoji[drawn[1].suit]}${drawn[1].value}\nهل ستكون البطاقة التالية "داخل" أو "خارج" هذا النطاق؟\n⏳ ينتهي خلال ${getExpiryTimestamp(20)}`)
      .setColor("#9b59b6");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("bus_inside").setLabel("📥 داخل").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("bus_outside").setLabel("📤 خارج").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("bus_quit").setLabel("❌ انسحاب ×5").setStyle(ButtonStyle.Danger)
    );

    await msg.edit({ content: " ", embeds: [embed], components: [row] });

    setTimeout(() => {
      const game = rideBusGames.get(userId);
      if (game && game.stage === 3) {
        rideBusGames.delete(userId);
        msg.edit({ content: `⏰ انتهى الوقت! خسرت الرهان.`, embeds: [], components: [] });
        deleteMessageLater(msg);
      }
    }, 20000);
  }

  // جولة 3
  if (stage === 3 && ["bus_inside", "bus_outside"].includes(i.customId)) {
    const values = [drawn[0].value, drawn[1].value];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const card = drawUniqueCard(drawn, values);
    drawn.push(card);
    const isInside = card.value > min && card.value < max;
    const result = (i.customId === "bus_inside" && isInside) || (i.customId === "bus_outside" && !isInside);

    if (!result) {
      rideBusGames.delete(userId);
      return msg.edit({ content: `❌ البطاقة كانت ${suitEmoji[card.suit]}${card.value}، توقّعك خاطئ! خسرت الرهان.`, embeds: [], components: [] }).then(deleteMessageLater);
    }

    game.stage = 4;
    const embed = new EmbedBuilder()
      .setTitle("🃏 الجولة الرابعة والأخيرة")
      .setDescription(`🎯 ما هو نوع (رمز) البطاقة القادمة؟\n📦 البطاقة السابقة: ${suitEmoji[drawn[2].suit]}${drawn[2].value}\n⏳ ينتهي خلال ${getExpiryTimestamp(20)}`)
      .setColor("#1abc9c");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("bus_♥️").setLabel("♥️").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("bus_♦️").setLabel("♦️").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("bus_♣️").setLabel("♣️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("bus_♠️").setLabel("♠️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("bus_quit").setLabel("❌ انسحاب ×10").setStyle(ButtonStyle.Danger)
    );

    await msg.edit({ content: " ", embeds: [embed], components: [row] });

    setTimeout(() => {
      const game = rideBusGames.get(userId);
      if (game && game.stage === 4) {
        rideBusGames.delete(userId);
        msg.edit({ content: `⏰ انتهى الوقت! خسرت الرهان.`, embeds: [], components: [] });
        deleteMessageLater(msg);
      }
    }, 20000);
  }

  // جولة 4
  if (stage === 4 && i.customId.startsWith("bus_")) {
    const guessSuit = i.customId.replace("bus_", "");
    const card = drawUniqueCard(drawn);
    const win = card.suit === guessSuit;

    if (win) {
      const reward = bet * 20;
      await addBalance(userId, reward);
      await updateSoloStats(userId, "solocard", bet, true, reward);
      rideBusGames.delete(userId);
      return msg.edit({ content: `🏆 البطاقة كانت ${suitEmoji[card.suit]}${card.value}، وفزت بـ ${reward.toLocaleString()} ريال!`, embeds: [], components: [] }).then(deleteMessageLater);
    } else {
      rideBusGames.delete(userId);
      return msg.edit({ content: `❌ البطاقة كانت ${suitEmoji[card.suit]}${card.value}، توقّعك خاطئ! خسرت الرهان.`, embeds: [], components: [] }).then(deleteMessageLater);
    }
  }
});


// 🎴 Blackjack Solo - نسخة محسّنة ومتكاملة

function startBlackjackSolo(interaction, bet) {
  if (!interaction.replied && !interaction.deferred) interaction.deferUpdate().catch(() => {});

  const userId = interaction.user.id;
  const drawCard = () => Math.floor(Math.random() * 10) + 2;

  const game = {
    player: [drawCard(), drawCard()],
    bot: [drawCard(), drawCard()],
    bet,
    userId
  };

  sendBlackjackMessage(interaction.channel, game);
}

function sendBlackjackMessage(channel, game) {
  const playerTotal = game.player.reduce((a, b) => a + b);

  const embed = new EmbedBuilder()
    .setTitle("🧠 بلاك جاك (ضد البوت)")
    .setDescription(`بطاقاتك: ${game.player.join(" + ")} = **${playerTotal}**\n\nاختر أحد الخيارات:`)
    .setColor(0x2ecc71);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bj_hit`).setLabel("🃏 سحب ورقة").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bj_stand`).setLabel("🛑 تثبيت").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`bj_quit`).setLabel("❌ انسحاب").setStyle(ButtonStyle.Danger)
  );

  channel.send({ embeds: [embed], components: [row] }).then(msg => {
    const id = game.userId;
    blackjackGames.set(id, { ...game, msg });
  });
}

const blackjackGames = new Map();

client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;
  if (![`bj_hit`, `bj_stand`, `bj_quit`].includes(i.customId)) return;

  const id = i.user.id;
  const game = blackjackGames.get(id);
  if (!game) return i.reply({ content: "❌ لا يوجد لعبة جارية.", ephemeral: true });

  await i.deferUpdate();

  if (i.customId === "bj_quit") {
    await addBalance(id, game.bet);
    blackjackGames.delete(id);
    return game.msg.edit({ content: `❌ انسحبت من اللعبة وتم استرجاع ${game.bet.toLocaleString()} ريال.`, embeds: [], components: [] });
  }

  if (i.customId === "bj_hit") {
    game.player.push(Math.floor(Math.random() * 10) + 2);
    const total = game.player.reduce((a, b) => a + b);

    if (total > 21) {
    await updateSoloStats(id, "blackjack", "خسارة");
    blackjackGames.delete(id);
    return game.msg.edit({
        embeds: [
          new EmbedBuilder().setTitle("💥 خسرت!").setDescription(`مجموع بطاقاتك: **${total}** تجاوز 21.`).setColor(0xe74c3c)
        ],
        components: []
      });
    }
    return game.msg.edit({ embeds: [
      new EmbedBuilder().setTitle("🧠 بلاك جاك (ضد البوت)").setDescription(`بطاقاتك: ${game.player.join(" + ")} = **${total}**`).setColor(0x3498db)
    ] });
  }

  if (i.customId === "bj_stand") {
    let botTotal = game.bot.reduce((a, b) => a + b);
    while (botTotal < 17) {
      game.bot.push(Math.floor(Math.random() * 10) + 2);
      botTotal = game.bot.reduce((a, b) => a + b);
    }

    const playerTotal = game.player.reduce((a, b) => a + b);
    const embed = new EmbedBuilder().setTitle("📊 النتيجة النهائية");
    let resultMsg = "";
    let color = 0x95a5a6;

    if (playerTotal > 21) {
      resultMsg = "💥 خسرت! تجاوزت 21.";
      color = 0xe74c3c;
    } else if (botTotal > 21 || playerTotal > botTotal) {
      await addBalance(id, game.bet * 2);
      resultMsg = `🏆 فزت!\nمجموعك: ${playerTotal} مقابل البوت: ${botTotal}\nربحت ${game.bet * 2} كاش`;
      color = 0x2ecc71;
    } else if (playerTotal < botTotal) {
      resultMsg = `😓 خسرت!\nمجموعك: ${playerTotal} مقابل البوت: ${botTotal}`;
      color = 0xe74c3c;
    } else {
      await addBalance(id, game.bet);
      resultMsg = `🤝 تعادل! تم استرجاع الرهان.\n${playerTotal} ضد ${botTotal}`;
      color = 0xf1c40f;
    }

    await updateSoloStats(id, "blackjack", playerTotal > 21 ? "خسارة" : (botTotal > 21 || playerTotal > botTotal ? "فوز" : playerTotal < botTotal ? "خسارة" : "تعادل"));
    blackjackGames.delete(id);
    embed.setDescription(resultMsg).setColor(color);
    const resultMessage = await game.msg.channel.send({ embeds: [embed] });
    setTimeout(() => resultMessage.delete().catch(() => {}), 5000);
    return game.msg.delete().catch(() => {});
  }
});


// 🔫 باكشوت (ضد البوت) - نسخة مطورة بذكاء اصطناعي

const buckshotGames = new Map();

function startBuckshotSolo(interaction, bet) {
  if (!interaction.replied && !interaction.deferred) interaction.deferUpdate().catch(() => {});

  const userId = interaction.user.id;
  const game = {
    userId,
    botId: "bot",
    username: interaction.user.username,
    playerHearts: 6,
    botHearts: 6,
    turn: "player",
    bet,
    deck: getBulletDeck(),
    tools: getRandomTools(),
    buffs: {
      playerDouble: false,
      playerCuffed: false,
      botDouble: false,
      botCuffed: false
    },
    gaveLowHpBonus: false,
    gaveReloadBonus: false,
    msg: null
  };

  buckshotGames.set(userId, game);
  sendBuckshotGameUI(interaction, userId);
}

function getRandomTools() {
  const items = ["مكبر", "منشار", "دواء", "بيرة", "أصفاد"];
  const tools = {};
  for (const item of items) {
    tools[item] = Math.floor(Math.random() * 2); // 0 أو 1 عشوائياً
  }
  return tools;
}

function getBulletDeck() {
  let real = Math.floor(Math.random() * 8) + 1;
  let fake = Math.floor(Math.random() * 8) + 1;
  while (Math.abs(real - fake) > 3) {
    real = Math.floor(Math.random() * 8) + 1;
    fake = Math.floor(Math.random() * 8) + 1;
  }
  const bullets = Array(real).fill("💥").concat(Array(fake).fill("😌"));
  return bullets.sort(() => Math.random() - 0.5);
}

function sendBuckshotGameUI(interaction, userId, log = null) {
  const game = buckshotGames.get(userId);
  if (!game) return;

  const isPlayerTurn = game.turn === "player";
  const embed = new EmbedBuilder()
    .setTitle(isPlayerTurn ? `🎯 دورك يا ${game.username}` : "💀 دور البوت")
    .setDescription(
      `**${game.username}**\n${"🖤".repeat(game.playerHearts)}\n\n🤖 البوت\n${"🖤".repeat(game.botHearts)}\n\n🔴 عدد الطلقات الحقيقية: ${game.deck.filter(b => b === "💥").length}\n⚪ عدد الطلقات الفارغة: ${game.deck.filter(b => b === "😌").length}` +
      (log ? `\n\n${log}` : "")
    )
    .setFooter({ text: "Buckshot Roulette" })
    .setColor(isPlayerTurn ? 0x2ecc71 : 0xe74c3c);

  const mainRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("buck_shoot_bot").setLabel("🔫 بوت").setStyle(ButtonStyle.Secondary).setDisabled(!isPlayerTurn),
    new ButtonBuilder().setCustomId("buck_shoot_self").setLabel("🔫 نايل").setStyle(ButtonStyle.Secondary).setDisabled(!isPlayerTurn),
    new ButtonBuilder().setCustomId("buck_quit").setLabel("انسحب").setStyle(ButtonStyle.Secondary).setDisabled(!isPlayerTurn)
  );

  const toolRow = new ActionRowBuilder().addComponents(
    ...Object.entries(game.tools).map(([tool, count]) =>
      new ButtonBuilder()
        .setCustomId(`buck_tool_${tool}`)
        .setLabel(`${getToolEmoji(tool)} ${tool} (${count})`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!isPlayerTurn || count <= 0)
    )
  );

  if (game.msg) {
    game.msg.edit({ embeds: [embed], components: [mainRow, toolRow] }).catch(() => {});
  } else {
    interaction.channel.send({ embeds: [embed], components: [mainRow, toolRow] }).then(msg => {
      game.msg = msg;
    });
  }
}

function getToolEmoji(tool) {
  const emojis = {
    مكبر: "🕵️‍♂️",
    منشار: "🪚",
    دواء: "💊",
    بيرة: "🍺",
    أصفاد: "🔒"
  };
  return emojis[tool] || "❓";
}

function grantRandomTools(game, count = 2) {
  const tools = Object.keys(game.tools);
  for (let i = 0; i < count; i++) {
    const random = tools[Math.floor(Math.random() * tools.length)];
    game.tools[random]++;
  }
}

client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;
  const userId = i.user.id;
  const game = buckshotGames.get(userId);
  if (!game || game.turn !== "player") return;
  await i.deferUpdate();

  if (i.customId === "buck_quit") {
    await addBalance(userId, game.bet);
    buckshotGames.delete(userId);
    return game.msg.edit({ content: `❌ انسحبت من اللعبة وتم استرجاع ${game.bet.toLocaleString()} ريال.`, embeds: [], components: [] });
  }

  if (i.customId.startsWith("buck_tool_")) {
    const tool = i.customId.replace("buck_tool_", "");
    if (game.tools[tool] <= 0) return;
    game.tools[tool]--;

    let msg = "";
    if (tool === "مكبر") {
      msg = `🔍 الطلقة التالية هي: ${game.deck[game.deck.length - 1]}`;
    } else if (tool === "منشار") {
      game.buffs.playerDouble = true;
      msg = "🪚 المنشار نشط: الضرر القادم سيكون مضاعف!";
    } else if (tool === "دواء") {
      if (game.playerHearts < 6) game.playerHearts++;
      msg = "💊 استخدمت دواء واستعدت قلب!";
    } else if (tool === "بيرة") {
      const removed = game.deck.pop();
      msg = `🍺 استخدمت بيرة وتم حذف الطلقة التالية (${removed})!`;
    } else if (tool === "أصفاد") {
      game.buffs.botCuffed = true;
      msg = "🔒 البوت مقيد ولن يستطيع اللعب بالدور القادم!";
    }

    return sendBuckshotGameUI(i, userId, msg);
  }

  if (["buck_shoot_self", "buck_shoot_bot"].includes(i.customId)) {
    if (game.deck.length === 0) {
      game.deck = getBulletDeck();
      grantRandomTools(game);
    }
    const shot = game.deck.pop();
    const isSelf = i.customId.includes("self");
    const target = isSelf ? "playerHearts" : "botHearts";
    const targetBuff = isSelf ? "playerDouble" : "botDouble";
    const targetName = isSelf ? "نفسك" : "البوت";
    const shooterName = i.user.username;

    let log = `🔫 ${shooterName} أطلق على ${targetName} وكانت `;

    if (shot === "💥") {
      const damage = game.buffs[targetBuff] ? 2 : 1;
      game[target] -= damage;
      game.buffs[targetBuff] = false;
      log += `طلقة حقيقية! (-${damage} ❤️)`;
    } else {
      log += `طلقة فارغة.`;
    }

    if ((game.playerHearts <= 3 || game.botHearts <= 3) && !game.gaveLowHpBonus) {
      grantRandomTools(game);
      game.gaveLowHpBonus = true;
      log += `\n🎁 تم توزيع أدوات إضافية بسبب القلوب القليلة!`;
    }

    if (game.playerHearts <= 0 || game.botHearts <= 0) {
      const won = game.botHearts <= 0;
      const resultEmbed = new EmbedBuilder()
        .setTitle(won ? "🏆 فزت!" : "💀 خسرت!")
        .setDescription(`${log}\n\n${won ? `ربحت ${(game.bet * 2).toLocaleString()} ريال` : `خسرت الرهان.`}`)
        .setColor(won ? 0x2ecc71 : 0xe74c3c);

      if (won) await addBalance(userId, game.bet * 2);
      await updateSoloStats(userId, "buckshot", won ? "فوز" : "خسارة");
      buckshotGames.delete(userId);

      const resultMsg = await game.msg.channel.send({ embeds: [resultEmbed] });
      setTimeout(() => resultMsg.delete().catch(() => {}), 60000);
      return game.msg.delete().catch(() => {});
    }

    if (!game.buffs.botCuffed) {
      game.turn = "bot";
      setTimeout(() => botPlay(userId), 3000);
    } else {
      game.buffs.botCuffed = false;
    }

    sendBuckshotGameUI(i, userId, log);
  }
});

function botPlay(userId) {
  const game = buckshotGames.get(userId);
  if (!game) return;

  const choice = Math.random();
  if (game.botHearts < 6 && game.tools.دواء > 0) {
    game.botHearts++;
    game.tools.دواء--;
  } else if (choice < 0.2 && game.tools.منشار > 0) {
    game.tools.منشار--;
    game.buffs.botDouble = true;
  } else if (choice < 0.4 && game.tools.أصفاد > 0) {
    game.tools.أصفاد--;
    game.buffs.playerCuffed = true;
  }

  if (game.deck.length === 0) {
    game.deck = getBulletDeck();
    grantRandomTools(game);
  }

  const onlyRealBullets = game.deck.every(b => b === "💥");
  const target = onlyRealBullets ? "botHearts" : "playerHearts";
  const targetBuff = target === "playerHearts" ? "playerDouble" : "botDouble";

  const shot = game.deck.pop();
  let log = `🔫 البوت أطلق على ${target === "playerHearts" ? game.username : "نفسه"} وكانت `;

  if (shot === "💥") {
    const damage = game.buffs.botDouble ? 2 : 1;
    game[target] -= damage;
    game.buffs.botDouble = false;
    log += `طلقة حقيقية! (-${damage} ❤️)`;
  } else {
    log += `طلقة فارغة.`;
  }

  game.turn = "player";
  sendBuckshotGameUI(game.msg, userId, log);
}


// ✅ اللوبيات النشطة
const activeLobbies = {};

// 🧠 منطق إنشاء اللوبي الجماعي عند اختيار لعبة من القائمة
client.on("interactionCreate", async (i) => {
  if (!i.isStringSelectMenu()) return;

  if (i.customId === "select_multi_game") {
    const gameId = i.values[0];
    const gameInfo = multiGamesMap[gameId];
    if (!gameInfo) return;

    // اغلق أي لوبي قديم في نفس القناة
    if (activeLobbies[i.channel.id]) {
      delete activeLobbies[i.channel.id];
    }

    const lobby = {
      hostId: i.user.id,
      gameId: gameId,
      players: {}, // userId: { username, bet, joinedAt }
      createdAt: Date.now(),
      status: "waiting",
      messageId: null,
      timeout: null
    };

    activeLobbies[i.channel.id] = lobby;

    const embed = new EmbedBuilder()
      .setTitle(`🎮 لوبي: ${gameInfo.name}`)
  .setDescription(`💡 انضم للعبة باستخدام الأزرار بالأسفل.

  لاعبين في اللوبي:
  (لا يوجد أحد حتى الآن)`)

      .setColor(0x3498db)
      .setFooter({ text: `الحد الأدنى: ${gameInfo.minPlayers} | الحد الأقصى: ${gameInfo.maxPlayers}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("lobby_join").setLabel("✅ انضمام").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("lobby_bet").setLabel("💸 تغيير الرهان").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("lobby_leave").setLabel("🚪 انسحاب").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("lobby_start").setLabel("🎮 ابدأ اللعبة").setStyle(ButtonStyle.Secondary)
    );

    const sent = await i.update({ embeds: [embed], components: [row], fetchReply: true });
    lobby.messageId = sent.id;

    // ⏱️ إغلاق تلقائي بعد 90 ثانية إذا لم تبدأ اللعبة
    lobby.timeout = setTimeout(() => {
      const currentLobby = activeLobbies[i.channel.id];
      if (!currentLobby || currentLobby.status !== "waiting") return;

      i.channel.messages.fetch(lobby.messageId).then(msg => {
        msg.edit({
          content: "❌ انتهى الوقت ولم يتم بدء اللعبة.",
          embeds: [],
          components: []
        }).catch(() => {});
      });

      delete activeLobbies[i.channel.id];
    }, 90000);
  }
});

// ✅ التعامل مع أزرار اللوبي الجماعي (انضمام فقط حالياً)
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  // تحقق إن الزر خاص باللوبي
  if (!["lobby_join", "lobby_bet", "lobby_leave", "lobby_start"].includes(i.customId)) return;

  const lobby = activeLobbies[i.channel.id];
  if (!lobby || lobby.status !== "waiting") {
    return i.reply({ content: "❌ هذا اللوبي غير متاح حالياً.", ephemeral: true });
  }

  const gameInfo = multiGamesMap[lobby.gameId];
  if (!gameInfo) return i.reply({ content: "❌ اللعبة غير موجودة.", ephemeral: true });

  const userId = i.user.id;

  // زر الانضمام
  if (i.customId === "lobby_join") {
    const alreadyJoined = lobby.players[userId];
    if (alreadyJoined) {
      return i.reply({ content: "❌ أنت بالفعل في هذا اللوبي.", ephemeral: true });
    }

    const playerCount = Object.keys(lobby.players).length;
    if (playerCount >= gameInfo.maxPlayers) {
      return i.reply({ content: "❌ اللوبي ممتلئ.", ephemeral: true });
    }

    const balance = await getBalance(userId);
    if (balance <= 0) {
      return i.reply({ content: "❌ لا يمكنك الانضمام، رصيدك صفر.", ephemeral: true });
    }

    // ✅ إذا الرصيد أقل من 1000، افتح مودال لتحديد الرهان
    if (balance < 1000) {
      const modal = new ModalBuilder()
        .setCustomId(`force_bet_modal_${userId}_${lobby.gameId}`)
        .setTitle("💸 اختر مبلغ الرهان")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("forced_bet_input")
              .setLabel(`رصيدك أقل من 1000 (${balance}). اختر مبلغ تراهن فيه:`)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      return i.showModal(modal);
    }

    // أضف اللاعب إلى اللوبي مباشرة
    await subtractBalance(userId, 1000);
    lobby.players[userId] = {
      username: i.user.username,
      bet: 1000,
      joinedAt: Date.now(),
      ready: true
    };

    // تحديث الرسالة الأصلية
    const lobbyMessage = await i.channel.messages.fetch(lobby.messageId).catch(() => null);
    if (!lobbyMessage) return;

    const playerLines = Object.entries(lobby.players).map(([id, data]) => {
      const status = data.ready ? "🟢 جاهز" : "🔴 غير جاهز";
      return `> 👤 ${data.username} - 💰 ${data.bet} - ${status}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎮 لوبي: ${gameInfo.name}`)
      .setDescription(`💡 انضم للعبة باستخدام الأزرار بالأسفل.

لاعبين في اللوبي:
${playerLines.join("\n")}`)
      .setColor(0x3498db)
      .setFooter({ text: `الحد الأدنى: ${gameInfo.minPlayers} | الحد الأقصى: ${gameInfo.maxPlayers}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("lobby_join").setLabel("✅ انضمام").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("lobby_bet").setLabel("💸 تغيير الرهان").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("lobby_leave").setLabel("🚪 انسحاب").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("lobby_start").setLabel("🎮 ابدأ اللعبة").setStyle(ButtonStyle.Secondary)
    );

    await lobbyMessage.edit({ embeds: [embed], components: [row] });
    await i.deferUpdate();
  }
});
// ✅ التعامل مع مودال تأكيد الرهان عند الانضمام أو تغييره
client.on("interactionCreate", async (i) => {
  if (!i.isModalSubmit()) return;

  const [prefix, userId, gameId] = i.customId.split("_");
  if (prefix !== "force" && prefix !== "bet") return;

  const lobby = activeLobbies[i.channel.id];
  if (!lobby || lobby.status !== "waiting") {
    return i.reply({ content: "❌ هذا اللوبي غير متاح حالياً.", ephemeral: true });
  }

  const input = i.fields.getTextInputValue("forced_bet_input");
  const betAmount = parseInt(input);
  if (isNaN(betAmount) || betAmount <= 0) {
    return i.reply({ content: "❌ يرجى إدخال مبلغ رهان صالح.", ephemeral: true });
  }

  const balance = await getBalance(i.user.id);
  const currentBet = lobby.players[i.user.id]?.bet || 0;
  const maxAllowed = balance + currentBet;

  if (betAmount > maxAllowed) {
    return i.reply({ content: `❌ لا تملك رصيداً كافياً. أقصى مبلغ يمكنك الرهان به هو ${maxAllowed}`, ephemeral: true });
  }

  if (!lobby.players[i.user.id]) {
    await subtractBalance(i.user.id, betAmount);
    lobby.players[i.user.id] = {
      username: i.user.username,
      bet: betAmount,
      joinedAt: Date.now(),
      ready: true
    };
  } else {
    const oldBet = lobby.players[i.user.id].bet;
    await addBalance(i.user.id, oldBet);
    await subtractBalance(i.user.id, betAmount);
    lobby.players[i.user.id].bet = betAmount;
    lobby.players[i.user.id].ready = true;
  }

  const gameInfo = multiGamesMap[lobby.gameId];
  const lobbyMessage = await i.channel.messages.fetch(lobby.messageId).catch(() => null);
  if (!lobbyMessage) return;

  const playerLines = Object.entries(lobby.players).map(([id, data]) => {
    const status = data.ready ? "🟢 جاهز" : "🔴 غير جاهز";
    return `> 👤 ${data.username} - 💰 ${data.bet} - ${status}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`🎮 لوبي: ${gameInfo.name}`)
    .setDescription(`💡 انضم للعبة باستخدام الأزرار بالأسفل.

لاعبين في اللوبي:
${playerLines.join("\n")}`)
    .setColor(0x3498db)
    .setFooter({ text: `الحد الأدنى: ${gameInfo.minPlayers} | الحد الأقصى: ${gameInfo.maxPlayers}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("lobby_join").setLabel("✅ انضمام").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("lobby_bet").setLabel("💸 تغيير الرهان").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("lobby_leave").setLabel("🚪 انسحاب").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("lobby_start").setLabel("🎮 ابدأ اللعبة").setStyle(ButtonStyle.Secondary)
  );

  await lobbyMessage.edit({ embeds: [embed], components: [row] });
  await i.reply({ content: "✅ تم تحديث مبلغ الرهان وحالتك أصبحت جاهز.", ephemeral: true });
});

// ✅ التعامل مع أزرار اللوبي والألعاب الجماعية
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  const lobby = activeLobbies[i.channel.id];
  const userId = i.user.id;
  const gameInfo = lobby ? multiGamesMap[lobby.gameId] : null;
  const player = lobby?.players?.[userId];

  if (["lobby_bet", "lobby_leave", "lobby_start"].includes(i.customId)) {
    if (!lobby || lobby.status !== "waiting") {
      return i.reply({ content: "❌ هذا اللوبي غير متاح حالياً.", ephemeral: true });
    }

    if (i.customId === "lobby_bet") {
      if (!player) return i.reply({ content: "❌ يجب أن تنضم أولاً قبل تغيير الرهان.", ephemeral: true });

      lobby.players[userId].ready = false;
      const modal = new ModalBuilder()
        .setCustomId(`bet_modal_${userId}_${lobby.gameId}`)
        .setTitle("💸 تغيير مبلغ الرهان")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("forced_bet_input")
              .setLabel("أدخل مبلغ الرهان الجديد:")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      return i.showModal(modal);
    }

    if (i.customId === "lobby_leave") {
      if (!player) return i.reply({ content: "❌ أنت لست ضمن هذا اللوبي.", ephemeral: true });

      delete lobby.players[userId];
      await addBalance(userId, player.bet);

      const lobbyMessage = await i.channel.messages.fetch(lobby.messageId).catch(() => null);
      if (!lobbyMessage) return;

      const playerLines = Object.entries(lobby.players).map(([id, data]) => {
        const status = data.ready ? "🟢 جاهز" : "🔴 غير جاهز";
        return `> 👤 ${data.username} - 💰 ${data.bet} - ${status}`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`🎮 لوبي: ${gameInfo.name}`)
        .setDescription(`💡 انضم للعبة باستخدام الأزرار بالأسفل.

لاعبين في اللوبي:
${playerLines.length > 0 ? playerLines.join("\n") : "(لا يوجد أحد حالياً)"}`)
        .setColor(0x3498db)
        .setFooter({ text: `الحد الأدنى: ${gameInfo.minPlayers} | الحد الأقصى: ${gameInfo.maxPlayers}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("lobby_join").setLabel("✅ انضمام").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("lobby_bet").setLabel("💸 تغيير الرهان").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("lobby_leave").setLabel("🚪 انسحاب").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("lobby_start").setLabel("🎮 ابدأ اللعبة").setStyle(ButtonStyle.Secondary)
      );

      await lobbyMessage.edit({ embeds: [embed], components: [row] });
      return i.reply({ content: "🚪 تم انسحابك من اللوبي وتم استرجاع المبلغ.", ephemeral: true });
    }

    if (i.customId === "lobby_start") {
      if (!player) return i.reply({ content: "❌ يجب أن تكون ضمن اللوبي لتبدأ اللعبة.", ephemeral: true });

      const joinedPlayers = Object.entries(lobby.players);
      const readyPlayers = joinedPlayers.filter(([id, p]) => p.ready);

      if (!gameInfo) return i.reply({ content: "❌ هذه اللعبة غير مدعومة حالياً.", ephemeral: true });

      if (readyPlayers.length < gameInfo.minPlayers) {
        return i.reply({ content: `❌ تحتاج إلى ${gameInfo.minPlayers} لاعبين جاهزين على الأقل لبدء اللعبة.`, ephemeral: true });
      }

      if (lobby.timeout) clearTimeout(lobby.timeout);

      await gameInfo.start(i.channel.id);
      return i.deferUpdate();
    }
  }

  // ✅ أزرار اللعب أثناء الجيم (hit, stand, الخ...)
  const knownGameButtons = [
    "hit", "stand",
    "color_pick", "kick", "next",
    "explode", "vote", "guess",
    "buckshot_shoot"
  ];

  if (knownGameButtons.includes(i.customId)) {
    const game = activeGames[i.channel.id];
    if (!game) return;

    const gameInfo = multiGamesMap[game.gameId];
    if (gameInfo?.handleInteraction) {
      await gameInfo.handleInteraction(i);
    }
    return;
  }
});

// ✅ خريطة الألعاب الجماعية (محدثة)
const multiGamesMap = {
  multi_blackjack: {
    start: startMultiplayerBlackjack,
    handleInteraction: handleMultiplayerBlackjackInteraction,
    name: "بلاك جاك الجماعي",
    minPlayers: 2,
    maxPlayers: 2
  },
  multi_buckshot: {
    start: startMultiplayerBuckshot,
    name: "باكشوت الجماعي",
    minPlayers: 2,
    maxPlayers: 2
  },
  multi_kicker: {
    start: startRouletteGame,
    name: "روليت الإقصاء",
    minPlayers: 2,
    maxPlayers: 99
  },
  multi_colorwar: {
    start: startColorWar,
    handleInteraction: handleColorWarInteraction,
    name: "لعبة الألوان",
    minPlayers: 2,
    maxPlayers: 3
  },
  multi_time: {
    start: startTimeRoom,
    name: "غرفة الزمن",
    minPlayers: 2,
    maxPlayers: 10
  },
  multi_bomb: {
    start: startExplosionGame,
    name: "عداد الانفجار",
    minPlayers: 2,
    maxPlayers: 99
  }
};

/******************************************
 * 📊 إحصائيات الألعاب الجماعية (جديدة) *
 ******************************************/

async function updateMultiplayerStats(userId, gameId, didWin, earned, lost) {
  const update = {
    $inc: {
      [`stats.${gameId}.gamesPlayed`]: 1,
      [`stats.${gameId}.${didWin ? "wins" : "losses"}`]: 1,
      [`stats.${gameId}.totalEarned`]: earned,
      [`stats.${gameId}.totalLost`]: lost,
    },
    $set: {
      [`stats.${gameId}.lastPlayed`]: new Date()
    }
  };

  await db.collection("multistats").updateOne(
    { userId },
    update,
    { upsert: true }
  );
}

async function showMultiplayerStats(user, interaction) {
  const userId = String(user.id);
  const doc = await db.collection("multistats").findOne({ userId });
  const allStats = doc?.stats || {};

  let totalWins = 0;
  let totalLosses = 0;
  let totalGames = 0;
  let totalEarned = 0;
  let totalLost = 0;

  for (const game of Object.values(allStats)) {
    totalWins += game.wins || 0;
    totalLosses += game.losses || 0;
    totalGames += game.gamesPlayed || 0;
    totalEarned += game.totalEarned || 0;
    totalLost += game.totalLost || 0;
  }

  const net = totalEarned - totalLost;
  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0";

  const embed = new EmbedBuilder()
    .setTitle(`📊 إحصائيات الألعاب الجماعية لـ ${user.username}`)
    .addFields(
      { name: "عدد مرات الفوز", value: `${totalWins}`, inline: true },
      { name: "عدد مرات الخسارة", value: `${totalLosses}`, inline: true },
      { name: "مجموع الجولات", value: `${totalGames}`, inline: true },
      { name: "نسبة الفوز", value: `${winRate}%`, inline: true },
      { name: "إجمالي الأرباح", value: `${totalEarned} 💰`, inline: true },
      { name: "إجمالي الخسائر", value: `${totalLost} 💸`, inline: true },
      { name: "الصافي", value: `${net >= 0 ? `+${net}` : net} 🧾`, inline: false }
    )
    .setColor(net >= 0 ? 0x2ecc71 : 0xe74c3c)
    .setFooter({ text: "إحصائيات جميع الألعاب الجماعية حتى الآن" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}


/******************************************
 * 🃏 Blackjack جماعي                     *
 ******************************************/

async function startMultiplayerBlackjack(channelId) {
  const lobby = activeLobbies[channelId];
  if (!lobby || lobby.status !== "waiting") return;

  const readyPlayers = Object.entries(lobby.players)
    .filter(([_, p]) => p.ready)
    .map(([id, p]) => ({ id, bet: p.bet }));

  if (readyPlayers.length < lobby.minPlayers) return;

  lobby.status = "playing";
  const deck = createDeck();
  shuffle(deck);

  const gameState = {
    players: {},
    deck,
    channelId,
    gameId: lobby.gameId  // ✅ ضروري لتوجيه الأزرار
  };


  for (const player of readyPlayers) {
    gameState.players[player.id] = {
      hand: [drawCard(deck), drawCard(deck)],
      bet: player.bet,
      done: false,
      stood: false,
      userId: player.id
    };
  }

  activeGames[channelId] = gameState;
  const gameMessage = await (await client.channels.fetch(channelId)).send({
    content: `🕹️ جاري بدء اللعبة...`,
    embeds: [new EmbedBuilder().setDescription("🔄 تجهيز الجولة...")],
  });
  gameState.gameMessageId = gameMessage.id;

  await playNextTurn(channelId);
}

function drawCard(deck) {
  return deck.pop();
}

function createDeck() {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }

  return deck;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function calculateHandTotal(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    if (['J', 'Q', 'K'].includes(card.value)) total += 10;
    else if (card.value === 'A') {
      aces++;
      total += 11;
    } else total += parseInt(card.value);
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

async function playNextTurn(channelId) {
  const game = activeGames[channelId];
  if (!game) return;

  const players = Object.values(game.players);
  const remaining = players.filter(p => !p.done);

  if (remaining.length === 0) {
    return finishGame(channelId);
  }

  const player = remaining[0];
  const user = await client.users.fetch(player.userId);
  const total = calculateHandTotal(player.hand);
  const handText = player.hand.map(c => `${c.value}${c.suit}`).join(" ");

  const embed = new EmbedBuilder()
    .setTitle(`🃏 دور ${user.username}`)
    .setDescription(`يدك الحالية: ${handText} (المجموع: ${total})`)
    .setFooter({ text: "اختر سحب أو تثبيت" })
    .setColor(0x1abc9c);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("hit").setLabel("🟩 سحب").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("stand").setLabel("🟥 تثبيت").setStyle(ButtonStyle.Danger)
  );

  const channel = await client.channels.fetch(channelId);
const msg = await channel.messages.fetch(game.gameMessageId).catch(() => null);

if (msg) {
  await msg.edit({ content: `<@${player.userId}>`, embeds: [embed], components: [row] });
} else {
  const newMsg = await channel.send({ content: `<@${player.userId}>`, embeds: [embed], components: [row] });
  game.gameMessageId = newMsg.id;
}
}

async function handleMultiplayerBlackjackInteraction(i) {
  const game = activeGames[i.channel.id];
  if (!game) return;

  const player = game.players[i.user.id];
  if (!player) {
    return i.reply({ content: "❌ أنت لست مشاركاً في هذه اللعبة.", ephemeral: true });
  }

  if (player.done) {
    return i.reply({ content: "❌ لقد أنهيت دورك بالفعل.", ephemeral: true });
  }

  const currentTurn = Object.values(game.players).find(p => !p.done);
  if (currentTurn.userId !== i.user.id) {
    return i.reply({ content: "❌ ليس دورك حالياً!", ephemeral: true });
  }

  if (i.customId === "hit") {
    const card = drawCard(game.deck);
    player.hand.push(card);

    const total = calculateHandTotal(player.hand);
    if (total > 21) {
      player.done = true;
      await i.deferUpdate();
      return finishGame(i.channel.id); // ⛔ ينهي اللعبة فورًا إذا تعدى 21
    }

    await i.deferUpdate();
    await playNextTurn(i.channel.id);
  }


  if (i.customId === "stand") {
    player.done = true;
    player.stood = true;
    await i.deferUpdate();
    await playNextTurn(i.channel.id);
  }
}
async function finishGame(channelId) {
  const game = activeGames[channelId];
  if (!game) return;

  const results = [];

  for (const playerId in game.players) {
    const player = game.players[playerId];
    const total = calculateHandTotal(player.hand);
    const status = total > 21 ? "❌ خسر (تجاوز 21)" : `✅ ${total}`;
    const handStr = player.hand.map(c => `${c.value}${c.suit}`).join(" ");
    results.push(`👤 <@${playerId}> - يد: ${handStr} = ${status}`);
  }

  const embed = new EmbedBuilder()
    .setTitle("📊 نتائج الجولة")
    .setDescription(results.join("\n"))
    .setColor(0x2ecc71);

  const channel = await client.channels.fetch(channelId);
  await channel.send({ embeds: [embed] });

  // حذف اللعبة من الذاكرة
  delete activeGames[channelId];
}
/******************************************
 * 🎯 لعبة الألوان (Color War) - متعددة *
 ******************************************/

const colorWarGames = {}; // تخزين بيانات كل جولة حسب channelId

async function startColorWar(channelId) {
  const lobby = activeLobbies[channelId];
  if (!lobby || lobby.status !== "waiting") return;

  const players = Object.entries(lobby.players)
    .filter(([_, p]) => p.ready)
    .map(([id, p]) => ({ id, username: p.username, bet: p.bet }));

  if (players.length < 2) return;

  lobby.status = "playing";

  const colors = players.length === 2 ? ["🔴", "⚫"] : ["🔴", "⚫", "🔵"];
  const grid = generateColorGrid(colors);
  const assignedColors = shuffle(colors.slice());
  const currentIndex = Math.floor(Math.random() * players.length);

  const game = {
    players,
    playerColors: {},
    scores: {},
    revealed: Array(25).fill(false),
    grid,
    currentIndex,
    message: null,
    timer: null,
    timeLeft: 30,
    channelId,
    lastRenderedContent: "",
    lastRenderedGrid: ""
  };

  players.forEach((p, idx) => {
    game.playerColors[p.id] = assignedColors[idx];
    game.scores[p.id] = 0;
  });

  colorWarGames[channelId] = game;
  const channel = await client.channels.fetch(channelId);
  const message = await channel.send({ content: "🕹️ جاري تجهيز اللعبة..." });
  game.message = message;

  updateColorGameMessage(channelId);
  startColorGameTimer(channelId);
}

function generateColorGrid(colors) {
  const grid = [];
  const base = Math.floor(25 / colors.length);
  let leftovers = 25 - base * colors.length;
  for (const color of colors) {
    const count = base + (leftovers-- > 0 ? 1 : 0);
    for (let i = 0; i < count; i++) grid.push(color);
  }
  return shuffle(grid);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startColorGameTimer(channelId) {
  const game = colorWarGames[channelId];
  if (!game) return;

  clearInterval(game.timer);
  game.timeLeft = 30;
  game.timer = setInterval(() => {
    game.timeLeft--;
    updateColorGameMessage(channelId);

    if (game.timeLeft <= 0) {
      clearInterval(game.timer);
      handleColorTimeout(channelId);
    }
  }, 1000);
}

  function updateColorGameMessage(channelId) {
  const game = colorWarGames[channelId];
  if (!game) return;
  const { players, currentIndex, grid, revealed, playerColors } = game;
  const currentPlayer = players[currentIndex];

  const content = `🎯 دور: <@${currentPlayer.id}> | لونك: ${playerColors[currentPlayer.id]}`;
  const gridKey = revealed.map((r, i) => (r ? grid[i] : "_")).join("");

  if (content === game.lastRenderedContent && gridKey === game.lastRenderedGrid) return;
  game.lastRenderedContent = content;
  game.lastRenderedGrid = gridKey;

    const components = [];
    for (let row = 0; row < 5; row++) {
      const rowComp = new ActionRowBuilder();
      for (let col = 0; col < 5; col++) {
        const idx = row * 5 + col;
        const revealedColor = revealed[idx] ? grid[idx] : "";
        const btn = new ButtonBuilder()
          .setCustomId(`color_${idx}`)
          .setLabel(revealedColor || '‎')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(revealed[idx]);
        rowComp.addComponents(btn);
      }
      components.push(rowComp);
    }

    if (game.message) {
      game.message.edit({ content, components }).catch(() => {});
    }
  }

function handleColorTimeout(channelId) {
  const game = colorWarGames[channelId];
  if (!game) return;
  const loser = game.players[game.currentIndex];
  const channel = client.channels.cache.get(channelId);

  if (game.players.length === 2) {
    const winner = game.players.find(p => p.id !== loser.id);
    channel.send(`⏱️ <@${loser.id}> تأخر وتم استبعاده.\n🏆 الفائز: <@${winner.id}>`);
    endColorGame(channelId);
  } else {
    game.players.splice(game.currentIndex, 1);
    delete game.playerColors[loser.id];
    delete game.scores[loser.id];
    if (game.currentIndex >= game.players.length) game.currentIndex = 0;
    channel.send(`⏱️ <@${loser.id}> تم استبعاده بسبب التأخير. اللعبة مستمرة.`);
    updateColorGameMessage(channelId);
    startColorGameTimer(channelId);
  }
}

function handleColorWarInteraction(i) {
  const game = colorWarGames[i.channel.id];
  if (!game) return;
  const idx = parseInt(i.customId.replace("color_", ""));
  const currentPlayer = game.players[game.currentIndex];

  if (i.user.id !== currentPlayer.id) return i.reply({ content: "❌ ليس دورك.", ephemeral: true });
  if (game.revealed[idx]) return i.reply({ content: "❌ هذه الخانة تم كشفها.", ephemeral: true });

  game.revealed[idx] = true;
  const color = game.grid[idx];
  if (color === game.playerColors[currentPlayer.id]) {
    game.scores[currentPlayer.id]++;
  }

  clearInterval(game.timer);
  game.currentIndex = (game.currentIndex + 1) % game.players.length;

  updateColorGameMessage(i.channel.id);

  if (game.revealed.every(cell => cell)) {
    finishColorGame(i.channel.id);
  } else {
    startColorGameTimer(i.channel.id);
  }
  i.deferUpdate();
}

function finishColorGame(channelId) {
  const game = colorWarGames[channelId];
  if (!game) return;

  let highest = -1;
  let winners = [];

  // نحسب النقاط الفعلية بناءً على الألوان المكشوفة
  for (const player of game.players) {
    const playerColor = game.playerColors[player.id];
    const actualCount = game.grid.filter((c, i) => game.revealed[i] && c === playerColor).length;
    game.scores[player.id] = actualCount;

    if (actualCount > highest) {
      highest = actualCount;
      winners = [player];
    } else if (actualCount === highest) {
      winners.push(player);
    }
  }


  const channel = client.channels.cache.get(channelId);
  if (winners.length === 1) {
    channel.send(`🎉 انتهت اللعبة!
🏆 الفائز: <@${winners[0].id}> بعدد ${highest} من الخانات.`);
  } else {
    const mentionList = winners.map(p => `<@${p.id}>`).join(" و ");
    channel.send(`🎉 انتهت اللعبة بالتعادل!
🤝 الفائزون: ${mentionList} بعدد ${highest} من الخانات.`);
  }

  // 🧠 حفظ الإحصائيات في MongoDB
  game.players.forEach(async player => {
    const didWin = winners.some(w => w.id === player.id);
    const earned = didWin ? player.bet * 2 : 0;
    const lost = didWin ? 0 : player.bet;

    await updateMultiplayerStats(player.id, "multi_colorwar", didWin, earned, lost);

    await db.collection("multistats").updateOne(
      { userId: player.id },
      {
        $set: { [`stats.multi_colorwar.lastPlayed`]: new Date() },
        $inc: {
          [`stats.multi_colorwar.totalGames`]: 1,
          [`stats.multi_colorwar.${didWin ? "wins" : "loses"}`]: 1,
          [`stats.multi_colorwar.net`]: earned - lost
        }
      },
      { upsert: true }
    );
  });

  endColorGame(channelId);
}

function endColorGame(channelId) {
  const game = colorWarGames[channelId];
  if (!game) return;
  clearInterval(game.timer);
  delete colorWarGames[channelId];
}

/******************************************/
// لا حاجة لتصدير لأن الكود سيبقى داخل index.js
// يمكنك فقط استدعاء startColorWar داخل multiGamesMap
/******************************************/

client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;
  if (i.customId.startsWith("color_")) {
    try {
      await handleColorWarInteraction(i);
    } catch (err) {
      console.error("❌ خطأ في لعبة الألوان:", err);
      if (!i.replied) {
        i.reply({ content: "حدث خطأ أثناء اللعبة.", ephemeral: true }).catch(() => {});
      }
    }
  }
});
// ✅ لعبة غرفة الزمن
const timeRoomGames = {};

async function startTimeRoom(channelId) {
  const lobby = activeLobbies[channelId];
  if (!lobby || lobby.status !== "waiting") return;

  const players = Object.entries(lobby.players)
    .filter(([_, p]) => p.ready)
    .map(([id, p]) => ({ id, username: p.username, bet: p.bet }));

  if (players.length < 2) return;
  lobby.status = "playing";

  const explosionTime = getWeightedExplosionTime();
  const game = {
    players,
    withdrawn: {},
    lastCheckpoint: 0,
    startTime: Date.now(),
    checkpointMultipliers: [1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7],
    channelId,
    explosionTime,
    interval: null,
    message: null,
    secondsElapsed: 0
  };

  timeRoomGames[channelId] = game;

  const row = new ActionRowBuilder().addComponents(
    players.map(p =>
      new ButtonBuilder()
        .setCustomId(`withdraw_${p.id}`)
        .setLabel(`🚪 انسحاب (${p.username})`)
        .setStyle(ButtonStyle.Danger)
    )
  );

  const embed = new EmbedBuilder()
    .setTitle("💣 غرفة الزمن")
    .setDescription("⏳ اللعبة بدأت! قاوم لأطول وقت ممكن بدون ما تنفجر الغرفة!")
    .setColor(0xf39c12);

  const channel = await client.channels.fetch(channelId);
  const msg = await channel.send({ embeds: [embed], components: [row] });
  game.message = msg;

  game.interval = setInterval(() => updateTimeRoom(channelId), 1000);
}

function getWeightedExplosionTime() {
  const weights = Array.from({ length: 60 }, (_, i) => i + 1).map(s => Math.pow(s, 1.6)); // زوّد الاحتماليات
  const total = weights.reduce((a, b) => a + b, 0);
  const rand = Math.random() * total;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand <= cumulative) return i + 1;
  }
  return 60;
}

async function updateTimeRoom(channelId) {
  const game = timeRoomGames[channelId];
  if (!game) return;

  game.secondsElapsed++;

  const stillPlaying = game.players.filter(p => game.withdrawn[p.id] !== "left");

  // 💥 انفجار
  if (game.secondsElapsed === game.explosionTime) {
    clearInterval(game.interval);
    const losers = stillPlaying;
    const channel = await client.channels.fetch(channelId);
    const loserMentions = losers.map(p => `<@${p.id}>`).join(" و ");

    await game.message.edit({
      content: `💥 **انفجرت الغرفة بعد ${game.secondsElapsed} ثانية!**\nالخاسرون: ${loserMentions}`,
      embeds: [],
      components: []
    });

    for (const loser of losers) {
      await updateMultiplayerStats(loser.id, "multi_time", false, 0, loser.bet);
    }

    delete timeRoomGames[channelId];
    return;
  }

  // 🪙 نقاط تشجيعية
  let checkpointText = "";
  if (game.secondsElapsed % 5 === 0) {
    const checkpoint = Math.floor(game.secondsElapsed / 5) - 1;
    const multiplier = game.checkpointMultipliers[checkpoint] || 1.5;
    game.lastCheckpoint = multiplier;
    for (const p of stillPlaying) {
      if (!game.withdrawn[p.id]) {
        game.withdrawn[p.id] = { multiplier }; // سجل آخر مضاعفة مؤهّل لها
      }
    }
    checkpointText = `\n🎁 **المكافأة الحالية: ${multiplier}x**`;
  } else if (game.lastCheckpoint > 0) {
    checkpointText = `\n🎁 **المكافأة الحالية: ${game.lastCheckpoint}x**`;
  }

  const embed = new EmbedBuilder()
    .setTitle("💣 غرفة الزمن")
    .setDescription(`⏱️ الوقت: ${game.secondsElapsed} ثانية\n👥 عدد اللاعبين داخل الغرفة: ${stillPlaying.length}${checkpointText}`)
    .setColor(0xf1c40f);

  game.message.edit({ embeds: [embed] }).catch(() => {});
}

// ✅ معالجة زر الانسحاب داخل الحدث العام
function handleTimeRoomWithdraw(i) {
  const channelId = i.channel.id;
  const game = timeRoomGames[channelId];
  if (!game) return;

  const userId = i.customId.replace("withdraw_", "");
  if (i.user.id !== userId) {
    return i.reply({ content: "❌ هذا الزر ليس لك!", ephemeral: true });
  }

  const player = game.players.find(p => p.id === userId);
  if (!player || game.withdrawn[userId] === "left") {
    return i.reply({ content: "❌ انسحبت بالفعل.", ephemeral: true });
  }

  clearInterval(game.interval);
  const checkpoint = game.withdrawn[userId]?.multiplier || game.lastCheckpoint || 1.5;
  const earned = Math.floor(player.bet * checkpoint);

  addBalance(userId, earned);
  updateMultiplayerStats(userId, "multi_time", true, earned, 0);

  game.withdrawn[userId] = "left";

  const stillPlaying = game.players.filter(p => game.withdrawn[p.id] !== "left");
  if (stillPlaying.length === 0) {
    game.message.edit({
      content: `✅ انسحب جميع اللاعبين بنجاح قبل الانفجار!\nاللعبة انتهت.`,
      embeds: [],
      components: []
    });
    delete timeRoomGames[channelId];
    return;
  }

  i.reply({ content: `✅ انسحبت بنجاح! ربحت ${earned.toLocaleString()} 💰`, ephemeral: true });
  game.interval = setInterval(() => updateTimeRoom(channelId), 1000);
}
/******************************************
 * 🔫 لعبة باكشوت الجماعي (Buckshot)     *
 ******************************************/

const buckshotMultiplayerGames = {};
const buckshotMultiItemsList = ["beer", "scope", "saw", "pills", "cuffs"];
const buckshotOneTimeItems = ["scope", "saw", "cuffs"]; // ✅ أدوات تُستخدم مرة واحدة فقط في كل جولة

async function startMultiplayerBuckshot(channelId) {
  const lobby = activeLobbies[channelId];
  if (!lobby || lobby.status !== "waiting") return;

  const players = Object.entries(lobby.players)
    .filter(([_, p]) => p.ready)
    .map(([id, p]) => ({ id, username: p.username, bet: p.bet }));

  if (players.length !== 2) return;
  lobby.status = "playing";

  const game = {
    players: players.map(p => ({
      id: p.id,
      username: p.username,
      health: 8,
      bet: p.bet,
      items: {},
      gotItemOnLowHealth: false
    })),
    currentPlayerIndex: 0,
    deck: generateBuckshotDeck(),
    activeEffects: {},
    gameMessage: null,
    channelId,
    log: "",
    usedThisTurn: {} // ✅ لمنع إعادة استخدام الأدوات الخاصة كل جولة
  };

  buckshotMultiplayerGames[channelId] = game;

  for (const player of game.players) giveBuckshotItems(player, 3);

  await renderMultiplayerBuckshot(channelId);

  const collector = game.gameMessage.createMessageComponentCollector({ time: 600_000 });
  collector.on("collect", async (i) => {
    const current = game.players[game.currentPlayerIndex];
    const other = game.players[1 - game.currentPlayerIndex];
    const userId = i.user.id;

    if (userId !== current.id) {
      return i.reply({ content: `❌ ليس دورك!`, ephemeral: true });
    }

    if (i.customId.startsWith("buckshot_use_")) {
      const item = i.customId.replace("buckshot_use_", "");
      const hasItem = current.items[item] && current.items[item] > 0;
      if (!hasItem) return i.reply({ content: `❌ لا تملك ${item} لاستخدامه.`, ephemeral: true });

      if (buckshotOneTimeItems.includes(item) && game.usedThisTurn[userId + "_" + item]) {
        return i.reply({ content: `❌ لا يمكنك استخدام ${item} أكثر من مرة في نفس الدور.`, ephemeral: true });
      }
      if (buckshotOneTimeItems.includes(item)) {
        game.usedThisTurn[userId + "_" + item] = true;
      }

      current.items[item]--;
      if (item === "scope") {
        const nextShot = game.deck[0];
        game.log = `${current.username} استخدم المنظار وكشف أن الطلقة ${nextShot ? "🔴 حقيقية" : "⚪ فارغة"}`;
      } else if (item === "beer") {
        const removed = game.deck.shift();
        game.log = `${current.username} شرب البيرة وحذف الطلقة (${removed ? "🔴 حقيقية" : "⚪ فارغة"})`;
        const realLeft = game.deck.filter(x => x === true).length;
        if (realLeft <= 0) game.deck = generateBuckshotDeck();
      } else if (item === "pills") {
        if (current.health < 8) {
          current.health++;
          game.log = `${current.username} استخدم الدواء واستعاد قلبًا ❤️`;
        } else {
          game.log = `${current.username} حاول استخدام الدواء لكن كان لديه 8 قلوب بالفعل.`;
        }
      } else if (item === "saw") {
        game.activeEffects.saw = userId;
        game.log = `${current.username} استخدم المنشار والضرر القادم سيكون مضاعفًا`;
      } else if (item === "cuffs") {
        game.activeEffects.cuffed = other.id;
        game.log = `${current.username} استخدم الأصفاد وقيّد حركة ${other.username}`;
      }
      await i.deferUpdate();
      return renderMultiplayerBuckshot(channelId);
    }

    const shootSelf = i.customId === "buckshot_self";
    const target = shootSelf ? current : other;
    const shot = game.deck.shift();
    let damage = shot ? 1 : 0;

    if (shot && game.activeEffects.saw === current.id) {
      damage *= 2;
      delete game.activeEffects.saw;
    }

    target.health -= damage;

    game.log = `${current.username} أطلق على ${shootSelf ? "نفسه" : other.username} وكانت الطلقة ${shot ? "🔴 حقيقية" : "⚪ فارغة"} ${damage > 1 ? "(ضرر مضاعف)" : ""}`;

    const realLeft = game.deck.filter(x => x === true).length;
    if (realLeft <= 0) game.deck = generateBuckshotDeck();

    for (const p of game.players) {
      if (!p.gotItemOnLowHealth && p.health <= 3) {
        p.gotItemOnLowHealth = true;
        giveBuckshotItems(p, 3);
        const enemy = game.players.find(pl => pl.id !== p.id);
        giveBuckshotItems(enemy, 2);
      }
    }

    if (target.health <= 0) {
      await updateMultiplayerStats(current.id, "multi_buckshot", true, current.bet * 2, 0);
      await updateMultiplayerStats(other.id, "multi_buckshot", false, 0, other.bet);
      await game.gameMessage.edit({
        content: `💀 <@${target.id}> مات! الفائز هو <@${current.id}> 🎉`,
        embeds: [],
        components: []
      });
      delete buckshotMultiplayerGames[channelId];
      collector.stop();
      return;
    }

    const enemyCuffed = game.activeEffects.cuffed === other.id;
    delete game.activeEffects.cuffed;
    game.usedThisTurn = {}; // ✅ إعادة السماح باستخدام الأدوات الخاصة في الدور الجديد

    if (!(shootSelf && damage === 0) && !enemyCuffed) {
      game.currentPlayerIndex = 1 - game.currentPlayerIndex;
    }

    await i.deferUpdate();
    await renderMultiplayerBuckshot(channelId);
  });
}

function giveBuckshotItems(player, count) {
  for (let i = 0; i < count; i++) {
    const item = buckshotMultiItemsList[Math.floor(Math.random() * buckshotMultiItemsList.length)];
    player.items[item] = (player.items[item] || 0) + 1;
  }
}

function generateBuckshotDeck() {
  const realCount = Math.floor(Math.random() * 8) + 1;
  let fakeCount;
  do {
    fakeCount = Math.floor(Math.random() * 8) + 1;
  } while (Math.abs(realCount - fakeCount) > 3);

  const deck = Array(realCount).fill(true).concat(Array(fakeCount).fill(false));
  return deck.sort(() => Math.random() - 0.5);
}


async function renderMultiplayerBuckshot(channelId) {
  const game = buckshotMultiplayerGames[channelId];
  if (!game) return;

  const current = game.players[game.currentPlayerIndex];
  const other = game.players[1 - game.currentPlayerIndex];

  const realShots = game.deck.filter(s => s === true).length;
  const fakeShots = game.deck.filter(s => s === false).length;

  const embed = new EmbedBuilder()
    .setTitle("🔫 باكشوت - 1 ضد 1")
    .setDescription(
      `**${current.username}** دورك الآن!

` +
      `${game.players.map(p => `❤️ ${p.username}: ${p.health} قلوب`).join("\n")}

` +
      `📜 ${game.log || "لا يوجد أحداث بعد."}

` +
      `🔫 عدد الطلقات المتبقية: ${game.deck.length}\n` +
      `🔴 الطلقات الحقيقية: ${realShots}\n` +
      `⚪ الطلقات الفارغة: ${fakeShots}`
    )
    .setColor(0x3498db);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("buckshot_self").setLabel("🔫 اطلق على نفسك").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("buckshot_enemy").setLabel("🔫 اطلق على الخصم").setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    buckshotMultiItemsList.map(t => new ButtonBuilder()
      .setCustomId(`buckshot_use_${t}`)
      .setLabel(`${t} (${current.items[t] || 0})`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled((current.items[t] || 0) <= 0))
  );

  const channel = await client.channels.fetch(channelId);
  if (!game.gameMessage) {
    const msg = await channel.send({ embeds: [embed], components: [row, row2] });
    game.gameMessage = msg;
  } else {
    game.gameMessage.edit({ embeds: [embed], components: [row, row2] }).catch(() => {});
  }
}
/******************************************
 * 💣 لعبة عداد الانفجار الجماعية         *
 ******************************************/

const explosionGames = {};

async function startExplosionGame(channelId) {
  const lobby = activeLobbies[channelId];
  if (!lobby || lobby.status !== "waiting") return;

  const players = Object.entries(lobby.players)
    .filter(([_, p]) => p.ready)
    .map(([id, p]) => ({ id, username: p.username }));

  if (players.length < 2) return;
  lobby.status = "playing";

  const game = {
    players,
    eliminated: [],
    currentHolder: null,
    holdStartTime: null,
    round: 1,
    roundStartTime: null,
    gameMessage: null,
    channelId,
    log: [],
    timeout: null,
    holdTimeout: null,
    messageTimestamp: null // ✅ وقت إرسال الرسالة
  };

  explosionGames[channelId] = game;
  await startExplosionRound(channelId);
}

function getRoundSettings(round) {
  if (round === 1) return { duration: 20000, explodeAfter: 5000 };
  if (round === 2) return { duration: 15000, explodeAfter: 4000 };
  return { duration: 10000, explodeAfter: 3000 };
}

async function startExplosionRound(channelId) {
  const game = explosionGames[channelId];
  if (!game) return;

  const { duration, explodeAfter } = getRoundSettings(game.round);
  game.roundStartTime = Date.now();
  game.messageTimestamp = Math.floor(Date.now() / 1000); // ✅ لحساب الوقت داخل الرسالة
  game.log.push(`🌀 بدأت الجولة ${game.round}`);

  const alivePlayers = game.players.filter(p => !game.eliminated.includes(p.id));
  if (alivePlayers.length === 1) {
    const winner = alivePlayers[0];
    await game.gameMessage?.edit({
      content: `🏆 الفائز هو <@${winner.id}>!`,
      embeds: [],
      components: []
    });
    delete explosionGames[channelId];
    return;
  }

  game.currentHolder = alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
  game.holdStartTime = Date.now();

  clearTimeout(game.timeout);
  clearTimeout(game.holdTimeout);

  game.timeout = setTimeout(() => bombExplodes(channelId), duration);
  game.holdTimeout = setTimeout(() => bombExplodes(channelId, true), explodeAfter);

  await renderExplosionGame(channelId);
}

async function passBomb(i, targetId) {
  const game = explosionGames[i.channelId];
  if (!game || game.currentHolder !== i.user.id || targetId === i.user.id) {
    return i.reply({ content: "❌ لا يمكنك تمرير القنبلة بهذا الشكل.", ephemeral: true });
  }

  game.currentHolder = targetId;
  game.holdStartTime = Date.now();
  game.log.push(`🔁 ${i.user.username} مرر القنبلة إلى ${game.players.find(p => p.id === targetId)?.username}`);

  clearTimeout(game.holdTimeout);
  const { explodeAfter } = getRoundSettings(game.round);
  game.holdTimeout = setTimeout(() => bombExplodes(i.channelId, true), explodeAfter);

  await i.deferUpdate();
  await renderExplosionGame(i.channelId);
}

async function bombExplodes(channelId, byHold = false) {
  const game = explosionGames[channelId];
  if (!game) return;

  const victim = game.players.find(p => p.id === game.currentHolder);
  if (!victim) return;

  game.eliminated.push(victim.id);
  game.log.push(`💥 انفجرت القنبلة على ${victim.username} ${byHold ? "(أمسك بها طويلاً)" : "(انتهى وقت الجولة)"}`);

  game.round++;
  await renderExplosionGame(channelId);
  setTimeout(() => startExplosionRound(channelId), 3000);
}

async function renderExplosionGame(channelId) {
  const game = explosionGames[channelId];
  if (!game) return;

  const embed = new EmbedBuilder()
    .setTitle(`💣 عداد الانفجار - الجولة ${game.round}`)
    .setDescription(
      game.players.map(p => `• ${p.username} ${p.id === game.currentHolder ? "🔥 (معه القنبلة)" : game.eliminated.includes(p.id) ? "☠️" : ""}`).join("\n") +
      "\n\n" +
      `🕓 بدأت الجولة: <t:${game.messageTimestamp}:R>\n` +
      `📜 ${game.log.at(-1) || "لا يوجد أحداث بعد."}`
    )
    .setColor(0xff4757);

  const row = new ActionRowBuilder().addComponents(
    game.players
      .filter(p => !game.eliminated.includes(p.id) && p.id !== game.currentHolder)
      .map(p => new ButtonBuilder()
        .setCustomId(`passbomb_${p.id}`)
        .setLabel(p.username)
        .setStyle(ButtonStyle.Primary))
  );

  const channel = await client.channels.fetch(channelId);
  if (!game.gameMessage) {
    game.gameMessage = await channel.send({ embeds: [embed], components: [row] });
  } else {
    game.gameMessage.edit({ embeds: [embed], components: [row] }).catch(() => {});
  }
}

client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;
  if (!i.customId.startsWith("passbomb_")) return;
  const targetId = i.customId.replace("passbomb_", "");
  return passBomb(i, targetId);
});

/******************************************
 * 🎲 روليت الإقصاء الجماعية             *
 ******************************************/

const rouletteGames = {};

async function startRouletteGame(channelId) {
  const lobby = activeLobbies[channelId];
  if (!lobby || lobby.status !== "waiting") return;

  const players = Object.entries(lobby.players)
    .filter(([_, p]) => p.ready)
    .map(([id, p]) => ({ id, username: p.username }));

  if (players.length < 2) return;
  lobby.status = "playing";

  const game = {
    players,
    eliminated: [],
    currentPlayer: null,
    roundStart: null,
    gameMessage: null,
    channelId,
    log: [],
    timeout: null
  };

  rouletteGames[channelId] = game;
  await nextRouletteTurn(channelId);
}

async function nextRouletteTurn(channelId) {
  const game = rouletteGames[channelId];
  if (!game) return;

  const alivePlayers = game.players.filter(p => !game.eliminated.includes(p.id));

  if (alivePlayers.length === 1) {
    const winner = alivePlayers[0];
    await game.gameMessage?.edit({
      content: `🏆 الفائز هو <@${winner.id}>!`,
      embeds: [],
      components: []
    });
    delete rouletteGames[channelId];
    return;
  }

  game.currentPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
  game.roundStart = Math.floor(Date.now() / 1000);

  game.log.push(`🎯 الدور على: ${game.players.find(p => p.id === game.currentPlayer)?.username}`);
  await renderRouletteGame(channelId);

  clearTimeout(game.timeout);
  game.timeout = setTimeout(() => eliminateInactive(channelId), 15000);
}

async function eliminateInactive(channelId) {
  const game = rouletteGames[channelId];
  if (!game) return;
  game.eliminated.push(game.currentPlayer);
  const user = game.players.find(p => p.id === game.currentPlayer);
  game.log.push(`⏰ لم يتخذ ${user.username} قرارًا وتم إقصاؤه تلقائيًا.`);
  await renderRouletteGame(channelId);
  const remaining = game.players.filter(p => !game.eliminated.includes(p.id));
  if (remaining.length === 1) {
    const winner = remaining[0];
    await game.gameMessage?.edit({
      content: `🏆 الفائز هو <@${winner.id}>!`,
      embeds: [],
      components: []
    });
    delete rouletteGames[channelId];
  } else {
    setTimeout(() => nextRouletteTurn(channelId), 1000);
  }
}

async function handleRouletteAction(i, targetId) {
  const game = rouletteGames[i.channelId];
  if (!game || game.currentPlayer !== i.user.id) {
    return i.reply({ content: `❌ ليس دورك.`, ephemeral: true });
  }

  const alive = game.players.filter(p => !game.eliminated.includes(p.id));

  if (targetId === "skip") {
    game.log.push(`🔄 ${i.user.username} قرر تجاوز الجولة دون إقصاء أحد.`);
  } else if (targetId === "random") {
    const choices = alive.filter(p => p.id !== i.user.id);
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    game.eliminated.push(chosen.id);
    game.log.push(`🎲 ${i.user.username} ضغط عشوائي، وتم طرد ${chosen.username}`);
  } else {
    if (targetId === i.user.id) return i.reply({ content: "❌ لا يمكنك طرد نفسك.", ephemeral: true });
    game.eliminated.push(targetId);
    const target = game.players.find(p => p.id === targetId);
    game.log.push(`☠️ ${i.user.username} طرد ${target.username}`);
  }

  clearTimeout(game.timeout);
  await i.deferUpdate();
  await renderRouletteGame(i.channelId);
  const remaining = game.players.filter(p => !game.eliminated.includes(p.id));
  if (remaining.length === 1) {
    const winner = remaining[0];
    await game.gameMessage?.edit({
      content: `🏆 الفائز هو <@${winner.id}>!`,
      embeds: [],
      components: []
    });
    delete rouletteGames[i.channelId];
  } else {
    setTimeout(() => nextRouletteTurn(i.channelId), 1000);
  }
}

async function renderRouletteGame(channelId) {
  const game = rouletteGames[channelId];
  if (!game) return;

  const embed = new EmbedBuilder()
    .setTitle("🎲 روليت الإقصاء")
    .setDescription(
      `🎯 الدور على: <@${game.currentPlayer}> — لديك 15 ثانية للاختيار
` +
      `🕓 بدأ الدور: <t:${game.roundStart}:R>

` +
      game.players.map(p => `• ${p.username} ${game.eliminated.includes(p.id) ? "☠️" : (p.id === game.currentPlayer ? "🎯" : "")}`).join("\n") +
      "\n\n📜 " + (game.log.at(-1) || "لا يوجد أحداث بعد.")
    )
    .setColor(0x9b59b6);

  const row1 = new ActionRowBuilder().addComponents(
    game.players
      .filter(p => !game.eliminated.includes(p.id) && p.id !== game.currentPlayer)
      .map(p => new ButtonBuilder()
        .setCustomId(`roulette_${p.id}`)
        .setLabel(p.username)
        .setStyle(ButtonStyle.Danger))
  );

  const aliveCount = game.players.filter(p => !game.eliminated.includes(p.id)).length;

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("roulette_random")
      .setLabel("🎲 عشوائي")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(aliveCount === 2),
    new ButtonBuilder()
      .setCustomId("roulette_skip")
      .setLabel("↩️ انسحاب")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(aliveCount === 2)
  );

  const channel = await client.channels.fetch(channelId);
  if (!game.gameMessage) {
    game.gameMessage = await channel.send({ embeds: [embed], components: [row1, row2] });
  } else {
    game.gameMessage.edit({ embeds: [embed], components: [row1, row2] }).catch(() => {});
  }
}

client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;
  if (!i.customId.startsWith("roulette_")) return;
  const target = i.customId.replace("roulette_", "");
  return handleRouletteAction(i, target);
});
////////////////////////////////////////////
// ✅ تريفيا - لعبة الأسئلة والأجوبة
////////////////////////////////////////////

client.on('messageCreate', async (message) => {
  if (message.content === 'تريفيا') {
    if (!message.guild) return;

    await message.channel.send('🎮 جاري بدء لعبة تريفيا...');
    const fakeInteraction = {
      channel: message.channel,
      user: message.author,
      editReply: (data) => message.channel.send(data),
      deferUpdate: async () => {},
      update: (data) => message.channel.send(data),
      customId: null,
    };
    startTriviaGame(fakeInteraction, db);
  }
});


// 🕹️ تشغيل لعبة تريفيا باستخدام ملف JSON محلي وصور محلية
const fs = require('fs');
const path = require('path');
const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'questions.json')));

async function startTriviaGame(interaction) {
  const channelId = interaction.channel.id;
  const userId = interaction.user.id;
  let usedIndices = new Set();
  let scoreMap = new Map();
  let round = 0;

  async function nextRound() {
    round++;
    if (round > 5) return endGame();

    if (usedIndices.size === questions.length) usedIndices.clear();

    let index;
    do {
      index = Math.floor(Math.random() * questions.length);
    } while (usedIndices.has(index));
    usedIndices.add(index);

    const questionDoc = questions[index];

    const imagePath = path.join(__dirname, 'images', 'questions', questionDoc.image);
    const attachment = new AttachmentBuilder(imagePath);

    const buttons = new ActionRowBuilder().addComponents(
      [1, 2, 3, 4].map((num) =>
        new ButtonBuilder()
          .setCustomId(`trivia_answer_${round}_${num}`)
          .setLabel(num.toString())
          .setStyle(ButtonStyle.Secondary)
      )
    );

    await interaction.editReply({
      files: [attachment],
      components: [buttons]
    });

    const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });
    let answered = false;

    collector.on('collect', async (btn) => {
      if (!btn.customId.startsWith(`trivia_answer_${round}_`)) return;
      if (answered) return btn.reply({ content: '❌ الإجابة تم اختيارها بالفعل!', ephemeral: true });

      const choice = parseInt(btn.customId.split('_')[3]);
      if (choice === questionDoc.answer) {
        answered = true;
        scoreMap.set(btn.user.id, (scoreMap.get(btn.user.id) || 0) + 1);
        await btn.reply({ content: '✅ إجابة صحيحة! كسبت 1000 ريال 💸', ephemeral: true });
        collector.stop();
        nextRound();
      } else {
        await btn.reply({ content: '❌ إجابتك غلط، حاول مرة أخرى.', ephemeral: true });
      }
    });

    collector.on('end', (_, reason) => {
      if (!answered && reason !== 'messageDelete') endGame();
    });
  }

  async function endGame() {
    const top = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]);
    const winners = top.map(([id, score], i) => `**${i + 1}. <@${id}>** — ${score} إجابات صحيحة`).join('\n');

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('trivia_restart').setLabel('🔁 جولة جديدة').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('trivia_end').setLabel('❌ إنهاء').setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      content: `🏁 **انتهت اللعبة!**\n\n${winners || 'لا أحد أجاب 😢'}`,
      components: [buttons]
    });
  }

  nextRound();
}

// ✅ مستمع للرد على أزرار "جولة جديدة" و "إنهاء"
async function handleTriviaButtons(interaction) {
  if (interaction.customId === 'trivia_restart') {
    await interaction.deferUpdate();
    startTriviaGame(interaction);
  } else if (interaction.customId === 'trivia_end') {
    await interaction.update({ content: '🛑 تم إنهاء اللعبة.', components: [] });
  }
}



/******************************************
 * 🎮 أمر قمار الموحد                     *
 ******************************************/
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("قمار") && !msg.content.startsWith("511")) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gamble_solo")
      .setLabel("🎲 الألعاب الفردية")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("gamble_multi")
      .setLabel("👥 الألعاب الجماعية")
      .setStyle(ButtonStyle.Secondary)
  );

  msg.channel.send({
    content: "🎰 اختر نوع اللعب:",
    components: [row]
  });
});

// عند اختيار فردي / جماعي
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  // عرض قائمة الألعاب
  if (["gamble_solo", "gamble_multi"].includes(i.customId)) {
    const isSolo = i.customId === "gamble_solo";

    const soloGames = [
      { label: "🎰 روليت", value: "soloroulette" },
      { label: "🎰 مكينة سلوت", value: "soloslot" },
      { label: "🎁 صندوق الغموض", value: "solomystery" },
      { label: "🎴 تحدي الأوراق", value: "solocard" },
      { label: "🧠 بلاك جاك", value: "soloblackjack" },
      { label: "🔫 باكشوت", value: "solobuckshot" }
    ];

    const multiGames = [
      { label: "🧠 بلاك جاك", value: "multi_blackjack" },
      { label: "🔫 باكشوت ", value: "multi_buckshot" },
      { label: "🎯 روليت ", value: "multi_kicker" },
      { label: "🟨 الألوان", value: "multi_colorwar" },
      { label: "⏳ عداد الانفجار", value: "multi_time" },
      { label: "💣 القنبلة", value: "multi_bomb" }
    ];

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(isSolo ? "select_solo_game" : "select_multi_game")
        .setPlaceholder("🎮 اختر لعبة")
        .addOptions(isSolo ? soloGames : multiGames)
    );

    

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(isSolo ? "solostats" : "multi_stats")
        .setLabel("📊 إحصائياتي")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("back_to_main")
        .setLabel("🔙 العودة")
        .setStyle(ButtonStyle.Secondary)
    );

    return i.update({
      content: `🎯 اختر اللعبة ${isSolo ? "الفردية" : "الجماعية"} التي تريدها:`,
      components: [menu, buttons]
    });
  }

  // زر العودة
  if (i.customId === "back_to_main") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("gamble_solo")
        .setLabel("🎲 الألعاب الفردية")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("gamble_multi")
        .setLabel("👥 الألعاب الجماعية")
        .setStyle(ButtonStyle.Secondary)
    );

    return i.update({
      content: "🎰 اختر نوع اللعب:",
      components: [row]
    });
  }

  // زر إحصائيات الألعاب الفردية
  if (i.customId === "solostats") {
    const embed = await getSoloStatsEmbed(i, "all");
    const reply = await i.channel.send({ embeds: [embed] });
    setTimeout(() => reply.delete().catch(() => {}), 10000);
    return;
  }


  // زر إحصائيات الألعاب الجماعية
  if (i.customId === "multistats") {
    await showMultiplayerStats(i.user, i);
    return;
  }
});






const { createCanvas, loadImage } = require('@napi-rs/canvas');

// دالة لتحميل صورة البروفايل
async function loadUserAvatar(user) {
  const url = user.displayAvatarURL({ extension: 'png', size: 256 });
  return await loadImage(url);
}

// دالة لرسم صورة دائرية
function drawCircularImage(ctx, img, x, y, radius) {
  const size = radius * 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x - radius, y - radius, size, size);
  ctx.restore();
}

// دالة لكتابة النصوص
function drawText(ctx, text, x, y, font = '100px', color = '#b0d4eb', align = 'center') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // أمر الرصيد
  if (message.content === "رصيد") {
    const balance = await getBalance(message.author.id);
    const background = await loadImage('./صوره المحفظه.png');
    const avatarImage = await loadUserAvatar(message.author);

    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(background, 0, 0);
    drawCircularImage(ctx, avatarImage, 294, 237, 139);
    drawText(ctx, `${balance.toLocaleString('en-US')}`, 750, 605);
    drawText(ctx, `${message.author.id}`, 300, 950, '35px Arial');

    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'wallet.png' });
    return message.reply({ files: [attachment] });
  }

  // أمر التحويل
  if (message.content.startsWith("تحويل")) {
    const args = message.content.split(" ");
    const mention = message.mentions.users.first();
    const amount = parseInt(args[2]);

    if (!mention || isNaN(amount) || amount <= 0) {
      return await message.reply("❌ الاستخدام الصحيح: تحويل @شخص 1000");
    }

    if (mention.id === message.author.id) {
      return await message.reply("❌ لا يمكنك تحويل رصيد لنفسك.");
    }

    const senderBalance = await getBalance(message.author.id);
    if (senderBalance < amount) {
      return await message.reply("❌ لا تملك رصيد كافي لإتمام التحويل.");
    }

    await addBalance(message.author.id, -amount);
    await addBalance(mention.id, amount);

    const background = await loadImage(path.join(__dirname, 'صوره التحويل.png'));
    const senderAvatar = await loadUserAvatar(message.author);
    const receiverAvatar = await loadUserAvatar(mention);

    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(background, 0, 0);
const member = await message.guild.members.fetch(mention.id);
const nickname = member?.nickname || member.user.username;

    drawCircularImage(ctx, senderAvatar, 330, 237, 160);
    drawCircularImage(ctx, receiverAvatar, 1320, 237, 160);
    drawText(ctx, `${amount.toLocaleString('en-US')}`, 850, 430, '115px');
    drawText(ctx, `${nickname}`, 850, 530, '75px Arial', '#b0d4eb', 'center');
    drawText(ctx, `${mention.id}`, 850, 600, '25px Arial', '#b0d4eb', 'center');
    drawText(ctx, `${message.author.id}`, 140, 1050, '35px Arial', '#b0d4eb', 'left');


    const buffer = await canvas.encode('png');
    return await message.reply({ files: [{ attachment: buffer, name: 'transfer.png' }] });
  }


 

 

});

