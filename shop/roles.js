// 📁 /shop/roles.js
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, subtractBalance } = require('./utils');

// مؤقتًا لتخزين الغرض المختار لكل مستخدم
const selectedRoleItem = new Map();

// إعداد يدوي للرولات داخل الكود (بدون MongoDB)
const roleItems = [
  {
    itemId: "sugar_daddy",
    name: "Sugar Daddy",
    roleId: "1388734284797444096",
    description: "رول المميز الأول",
    price: 100000
  },
  {
    itemId: "sugar_mommy",
    name: "Sugar Mommy",
    roleId: "1388734115825586207",
    description: "رول المميز الثاني",
    price: 100000
  }
];

module.exports = async function handleRolesSection(interaction, db) {
  console.log("✅ دخل roles.js");

  const options = roleItems.map(item => ({
    label: item.name,
    description: `${item.price} كاش - ${item.description || ""}`.trim(),
    value: item.itemId
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("buy_roles_item")
    .setPlaceholder("اختر رول")
    .addOptions(options);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("shop_back").setLabel("↩️ العودة").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("confirm_roles_purchase").setLabel("✅ تأكيد الشراء").setStyle(ButtonStyle.Success)
  );

  await interaction.update({
    content: '',
    embeds: [new EmbedBuilder().setTitle("🧢 قسم الرولات").setImage("https://yourdomain.com/images/roles.jpg")],
    components: [row1, row2]
  });

  // متابعة التفاعل مع القائمة
  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: 60000
  });

  collector.on("collect", async (i) => {
    if (i.customId === "buy_roles_item") {
      const chosen = i.values[0];
      selectedRoleItem.set(i.user.id, chosen);
      await i.reply({ content: `🎯 تم اختيار: **${chosen}**`, ephemeral: true });
    }

    if (i.customId === "confirm_roles_purchase") {
      const itemId = selectedRoleItem.get(i.user.id);
      if (!itemId) return i.reply({ content: "❌ اختر غرضًا أولاً.", ephemeral: true });

      const item = roleItems.find(it => it.itemId === itemId);
      const guild = i.guild;
      const member = await guild.members.fetch(i.user.id);
      const role = guild.roles.cache.get(item.roleId);

      if (!role) {
        return i.reply({ content: "❌ هذا الرول غير موجود حالياً في السيرفر.", ephemeral: true });
      }

      if (member.roles.cache.has(role.id)) {
        return i.reply({ content: "❌ لديك هذا الرول بالفعل!", ephemeral: true });
      }

      const balance = await getBalance(i.user.id, db);
      if (balance < item.price) {
        return i.reply({ content: `❌ لا تملك رصيداً كافياً. السعر: ${item.price}`, ephemeral: true });
      }

      await subtractBalance(i.user.id, item.price, db);
      await member.roles.add(role).catch(() => {});

      await i.reply({ content: `✅ تم شراء الرول: **${item.name}** بمبلغ ${item.price} كاش.`, ephemeral: true });
    }

  if (i.customId === "shop_back") {
  const shopCommand = require("../commands/shop");
  await i.message.delete().catch(() => {});
  return shopCommand(i);
}
  });
};
