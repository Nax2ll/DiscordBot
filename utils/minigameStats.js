// utils/minigameStats.js
const { EmbedBuilder } = require("discord.js");

module.exports = async function showMinigameStats(interaction, db) {
  const userId = interaction.user.id;
  const doc = await db.collection("minigame_stats").findOne({ userId });
  const stats = doc?.games || {};

  const games = [
    { key: "fakkak", name: "🧩 فكّك" },
    { key: "jam3", name: "🔡 جمّع" },
    { key: "asra3", name: "⚡ أسرع" },
    { key: "rakkib", name: "🔤 ركّب" },
    { key: "flags_country", name: "🏳️ علم + دولة" },
    { key: "flags_capital", name: "🏙️ علم + عاصمة" }
  ];

  const embed = new EmbedBuilder()
    .setTitle(`📊 إحصائيات ألعاب الميني جيم لـ ${interaction.user.username}`)
    .setColor("Green");

  let totalScore = 0;

  for (const game of games) {
    const s = stats[game.key] || { wins: 0, played: 0 };
    const percent = s.played > 0 ? ((s.wins / s.played) * 100).toFixed(1) : "0";
    totalScore += s.wins * 1000;
    embed.addFields({
      name: `${game.name}`,
      value: `✅ صحيحة: ${s.wins} / ${s.played}\n💰 ${s.wins * 1000} ريال\n🎯 نسبة الفوز: ${percent}%`,
      inline: true
    });
  }

  embed.setFooter({ text: `الإجمالي: ${totalScore.toLocaleString()} ريال` });
  return interaction.reply({ embeds: [embed], ephemeral: true });
}
