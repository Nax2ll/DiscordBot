// minigames/rakkib.js
const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");

async function addBalance(userId, amount, db) {
  await db.collection("users").updateOne(
    { userId: String(userId) },
    { $inc: { wallet: amount } },
    { upsert: true }
  );
}

const dictionary = require("../data/dictionary.json");
const wordPool = require("../data/word_pool.json");
const updateMinigameStats = require("../utils/updateMinigameStats");

const activeGames = new Map();

module.exports = async function startRakkibGame(interaction, db) {
  const gameId = interaction.id;
  if (activeGames.has(gameId)) return interaction.reply({ content: "<:icons8wrong1001:1415979909825695914> هناك لعبة جارية بالفعل.", ephemeral: true });

  const usedIndices = new Set();
  let round = 0;
  const scores = new Map(); // { userId: { points, username } }

  const gameMessage = await interaction.reply({ content: "🕹️ جاري بدء لعبة ركّب...", fetchReply: true });
  activeGames.set(gameId, true);

  // سنحذف آخر رسالة بعد 10 ثوانٍ من إرسال الرسالة التالية
  let lastRoundMessage = gameMessage;

  async function nextRound() {
    if (round >= 5) return endGame();
    round++;

    let word;
    let attempts = 0;
    do {
      word = wordPool[Math.floor(Math.random() * wordPool.length)];
      attempts++;
    } while (usedIndices.has(word.word) && attempts < 10);
    usedIndices.add(word.word);

    const shuffled = shuffle(word.word.split(""));
    const imageBuffer = await drawLettersImage(shuffled.join(" "));
    const attachment = new AttachmentBuilder(imageBuffer, { name: `rakkib.png` });

    // إرسال رسالة جديدة لكل جولة
    const roundMsg = await interaction.followUp({
      content: `🔤 كوّن كلمة من هذه الحروف (${round}/5)`,
      files: [attachment],
      embeds: []
    });

    // حذف رسالة الجولة السابقة بعد 10 ثوانٍ
    if (lastRoundMessage) {
      const toDelete = lastRoundMessage;
      setTimeout(() => {
        toDelete.delete().catch(() => {});
      }, 10_000);
    }
    lastRoundMessage = roundMsg;

    const collector = gameMessage.channel.createMessageCollector({ time: 30_000 });
    let answered = false;

    collector.on("collect", async (msg) => {
      if (answered) return; // أول إجابة صحيحة فقط

      const input = msg.content.replace(/\s+/g, "").trim();
      // يجب أن تكون الكلمة في القاموس
      if (!dictionary.includes(input)) return;
      // يجب استخدام جميع الحروف (أناغرام كامل)
      if (input.length !== word.word.length) return;
      if (!canBeFormedFrom(input, word.word)) return;

      answered = true;

      const isOriginal = input === word.word;
      const pointsEarned = isOriginal ? 2 : 1;
      const cashEarned = isOriginal ? 2000 : 1000;

      // تحديث نقاط اللاعب
      const prev = scores.get(msg.author.id) || { points: 0, username: msg.author.username };
      prev.points += pointsEarned;
      scores.set(msg.author.id, prev);

      // إضافة فلوس
      await addBalance(msg.author.id, cashEarned, db);
      await db.collection("transactions").insertOne({
        userId: msg.author.id,
        amount: cashEarned,
        reason: "ربح من لعبة ركب",
        timestamp: new Date()
      });

      await updateMinigameStats(db, msg.author.id, "rakkib", true);

      await msg.react("1415979896433278986");

      collector.stop();
      nextRound();
    });

    collector.on("end", () => {
      if (!answered) nextRound();
    });
  }

  async function endGame() {
    activeGames.delete(gameId);

    // ترتيب اللاعبين
    const ranking = [...scores.entries()]
      .sort((a, b) => b[1].points - a[1].points)
      .map(([id, data], idx) => `**${idx + 1}. ${data.username}** - ${data.points} نقطة (💰 ${data.points * 1000})`)
      .join("\n");

    // إرسال رسالة النهاية كرسالة جديدة
    const endMsg = await interaction.followUp({
      content:
        `🏁 انتهت لعبة ركّب!\n\n${ranking || "<:icons8wrong1001:1415979909825695914> لم يجب أحد"}\n\n🥇 الفائز: ${ranking ? ranking.split("\n")[0] : "لا يوجد"}`,
      components: [],
      embeds: [],
      files: []
    });

    // حذف آخر رسالة جولة بعد 10 ثوانٍ من إرسال رسالة النهاية
    if (lastRoundMessage) {
      const toDelete = lastRoundMessage;
      setTimeout(() => {
        toDelete.delete().catch(() => {});
      }, 10_000);
    }

    // حذف رسالة النهاية بعد 25 ثانية
    setTimeout(() => {
      endMsg.delete().catch(() => {});
    }, 25_000);

    return endMsg;
  }

  nextRound();
};

function canBeFormedFrom(input, base) {
  const available = base.split("");
  for (const letter of input) {
    const index = available.indexOf(letter);
    if (index === -1) return false;
    available.splice(index, 1);
  }
  return true;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function drawLettersImage(letters) {
  const bgPath = path.join(__dirname, "../assets/rakb.png");
  const bg = await loadImage(bgPath);

  const canvas = createCanvas(bg.width, bg.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bg, 0, 0);

  ctx.font = "90px Cairo";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(letters, canvas.width / 2, 250);

  return canvas.encode("png");
}
