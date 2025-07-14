// 📁 /commands/shop.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = async function handleShopCommand(message) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('shop_section_select') // ✅ هذا أهم شيء
    .setPlaceholder('اختر قسمًا من المتجر')
    .addOptions([
      { label: '🧢 الرولات', value: 'section_roles' },
      { label: '🚔 السجن', value: 'section_jail' },
      { label: '🎰 القمار', value: 'section_gambling' },
      { label: '⚠️ العقوبات', value: 'section_punishments' }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('shop_inventory')
      .setLabel('🧳 أغراضي')
      .setStyle(ButtonStyle.Secondary)
  );

  const embed = new EmbedBuilder()
    .setTitle("🛒 المتجر الرئيسي")
    .setDescription("اختر قسمًا من القائمة لعرض الأغراض المتوفرة.")
    .setImage("https://i.ibb.co/CpW8zB3N/Milky-way-store.jpg")
    .setColor("#00b894");

  await message.reply({
    embeds: [embed],
    components: [row, buttonRow]
  });
};
