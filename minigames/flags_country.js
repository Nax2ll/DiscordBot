// minigames/flags_country.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

async function addBalance(userId, amount, db) {
  await db.collection("users").updateOne(
    { userId: String(userId) },
    { $inc: { wallet: amount } },
    { upsert: true }
  );
}

const flags = require("../data/flags.json");
const updateMinigameStats = require("../utils/updateMinigameStats");

const activeGames = new Map();

module.exports = async function startFlagsCountryGame(interaction, db) {
  const gameId = interaction.id; // نستخدم ID مميز للتفاعل
  if (activeGames.has(gameId)) return interaction.reply({ content: "❌ هناك لعبة جارية بالفعل.", ephemeral: true });

  let round = 0;
  const scores = new Map(); // { userId: { points, username } }

  const gameMessage = await interaction.reply({ content: "🕹️ جاري بدء لعبة علم + دولة ...", fetchReply: true });
  activeGames.set(gameId, true);

  async function nextRound() {
    if (round >= 5) return endGame();
    round++;

    const choices = shuffle([...flags]).slice(0, 4);
    const correct = choices[Math.floor(Math.random() * choices.length)];

    const buttons = new ActionRowBuilder().addComponents(
      choices.map((flag) =>
        new ButtonBuilder()
          .setCustomId(`flag_${round}_${flag.country}`)
          .setLabel(flag.country)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    await gameMessage.edit({
      content: `🏳️ (${round}/5)\nاختر اسم الدولة:`,
      files: [correct.image],
      components: [buttons],
      embeds: []
    });

    const collector = gameMessage.createMessageComponentCollector({ time: 30_000 });
    let answered = false;

    collector.on("collect", async (btn) => {
      const picked = btn.customId.split("_")[2];
      const userId = btn.user.id;

      if (answered) {
        return btn.reply({ content: "⏱️ سبق وتمت الإجابة الصحيحة في هذه الجولة!", ephemeral: true });
      }

      if (picked === correct.country) {
        answered = true;

        // تحديث نقاط اللاعب
        const prev = scores.get(userId) || { points: 0, username: btn.user.username };
        prev.points += 1;
        scores.set(userId, prev);

        // إضافة فلوس
        await addBalance(userId, 1000, db);
        await db.collection("transactions").insertOne({
          userId,
          amount: 1000,
          reason: "ربح من لعبة اعلام دول",
          timestamp: new Date()
        });

        await updateMinigameStats(db, userId, "flags_country", true);

        await btn.reply({ content: `✅ إجابة صحيحة! (+1 نقطة, +1000 💰)`, ephemeral: true });

        collector.stop();
        nextRound();
      } else {
        await btn.reply({ content: "❌ إجابة خاطئة!", ephemeral: true });
      }
    });

    collector.on("end", () => {
      if (!answered) nextRound();
    });
  }

  function endGame() {
    activeGames.delete(gameId);

    // ترتيب اللاعبين حسب النقاط
    const ranking = [...scores.entries()]
      .sort((a, b) => b[1].points - a[1].points)
      .map(([id, data], idx) => `**${idx + 1}. ${data.username}** - ${data.points} نقطة (💰 ${data.points * 1000})`)
      .join("\n");

    return gameMessage.edit({
      content:
        `🏁 انتهت اللعبة!\n\n${ranking || "❌ لم يجب أحد"}\n\n🥇 الفائز: ${ranking ? ranking.split("\n")[0] : "لا يوجد"}`,
      components: [],
      embeds: [],
      files: []
    });
  }

  nextRound();
};

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
