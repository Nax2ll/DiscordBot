// commands/minigames.js
const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = async function handleMinigamesCommand(message) {
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("minigame_menu")
      .setPlaceholder("🎮 اختر لعبة")
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel("🧩 فكّك").setValue("fakkak"),
        new StringSelectMenuOptionBuilder().setLabel("🔡 جمّع").setValue("jam3"),
        new StringSelectMenuOptionBuilder().setLabel("⚡ أسرع").setValue("asra3"),
        new StringSelectMenuOptionBuilder().setLabel("🔤 ركّب").setValue("rakkib"),
        new StringSelectMenuOptionBuilder().setLabel("🏳️ علم + دولة").setValue("flags_country"),
        new StringSelectMenuOptionBuilder().setLabel("🏙️ علم + عاصمة").setValue("flags_capital")
      )
  );

  const statsButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("minigame_stats")
      .setLabel("📊 إحصائياتي")
      .setStyle(ButtonStyle.Primary)
  );

  await message.reply({
    content: "🎯 اختر واحدة من ألعاب الميني جيم التالية:",
    components: [row, statsButton]
  });
}
