// minigames/asra3.js
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

const wordPool = require("../data/word_pool.json");
const updateMinigameStats = require("../utils/updateMinigameStats");

const activeGames = new Map();

module.exports = async function startAsra3Game(interaction, db) {
  const gameId = interaction.id;
  if (activeGames.has(gameId)) return interaction.reply({ content: "❌ هناك لعبة جارية بالفعل.", ephemeral: true });

  const usedIndices = new Set();
  let round = 0;
  const scores = new Map(); // { userId: { points, username } }

  const gameMessage = await interaction.reply({ content: "🕹️ جاري بدء لعبة أسرع...", fetchReply: true });
  activeGames.set(gameId, true);

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

    const imageBuffer = await drawWordImage(word.word);
    const attachment = new AttachmentBuilder(imageBuffer, { name: `asra3.png` });

    await gameMessage.edit({
      content: `⚡ اكتب الكلمة بسرعة (${round}/5)`,
      files: [attachment],
      embeds: []
    });

    const collector = gameMessage.channel.createMessageCollector({ time: 30_000 });
    let answered = false;

    collector.on("collect", async (msg) => {
      if (answered) return; // أول واحد فقط

      const guess = msg.content.replace(/\s+/g, "").trim();
      if (guess === word.word) {
        answered = true;

        // تحديث نقاط اللاعب
        const prev = scores.get(msg.author.id) || { points: 0, username: msg.author.username };
        prev.points += 1;
        scores.set(msg.author.id, prev);

        // إضافة فلوس
        await addBalance(msg.author.id, 1000, db);
        await db.collection("transactions").insertOne({
          userId: msg.author.id,
          amount: 1000,
          reason: "ربح من لعبة أسرع",
          timestamp: new Date()
        });

        await updateMinigameStats(db, msg.author.id, "asra3", true);

        await msg.react("✅"); // ✅ يظل نفس نظام الرياكشن

        collector.stop();
        nextRound();
      }
    });

    collector.on("end", () => {
      if (!answered) nextRound();
    });
  }

  function endGame() {
    activeGames.delete(gameId);

    // ترتيب اللاعبين
    const ranking = [...scores.entries()]
      .sort((a, b) => b[1].points - a[1].points)
      .map(([id, data], idx) => `**${idx + 1}. ${data.username}** - ${data.points} نقطة (💰 ${data.points * 1000})`)
      .join("\n");

    return gameMessage.edit({
      content:
        `🏁 انتهت لعبة أسرع!\n\n${ranking || "❌ لم يجب أحد"}\n\n🥇 الفائز: ${ranking ? ranking.split("\n")[0] : "لا يوجد"}`,
      components: [],
      embeds: [],
      files: []
    });
  }

  nextRound();
};

async function drawWordImage(word) {
  const bgPath = path.join(__dirname, "../assets/asr3.png");
  const bg = await loadImage(bgPath);

  const canvas = createCanvas(bg.width, bg.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bg, 0, 0);

  ctx.font = "90px Cairo";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(word, canvas.width / 2, 250);

  return canvas.encode("png");
}
