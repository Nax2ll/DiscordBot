const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require("discord.js");
const { getBalance, subtractBalance } = require("./utils");

// مؤقتًا لتخزين الغرض المختار لكل مستخدم
const selectedRoleItem = new Map();

// إعداد يدوي للرولات داخل الكود (بدون MongoDB)
const roleItems = [
  {
    itemId: "sugar_daddy",
    name: "Sugar Daddy",
    roleId: "1388734284797444096",
    price: 100000
  },
  {
    itemId: "sugar_mommy",
    name: "Sugar Mommy",
    roleId: "1388734115825586207",
    price: 100000
  }
];

module.exports = async function handleRolesSection(interaction, db) {
  console.log("✅ دخل roles.js");

  const options = roleItems.map(item => ({
    label: item.name,
    description: `${item.price.toLocaleString("en-US")} ريال`,
    value: item.itemId
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("buy_roles_item")
    .setPlaceholder("اختر رول")
    .addOptions(options);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("shop_back")
      .setLabel(" العودة")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1407426312603439226"),
    new ButtonBuilder()
      .setCustomId("confirm_roles_purchase")
      .setLabel(" تأكيد الشراء")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1407440011183259699")
  );

  // 🖼️ صورة الرولات مباشرة
  const rolesImg = new AttachmentBuilder("./assets/templates/Roles.png", { name: "Roles.png" });

  await interaction.update({
    content: "",
    files: [rolesImg],
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
      if (!itemId) return i.reply({ content: " اختر غرضًا أولاً. <:icons8wrong100:1407439999611310130>", ephemeral: true });

      const item = roleItems.find(it => it.itemId === itemId);
      const guild = i.guild;
      const member = await guild.members.fetch(i.user.id);
      const role = guild.roles.cache.get(item.roleId);

      if (!role) {
        return i.reply({ content: " هذا الرول غير موجود حالياً في السيرفر. <:icons8wrong100:1407439999611310130>", ephemeral: true });
      }

      if (member.roles.cache.has(role.id)) {
        return i.reply({ content: " لديك هذا الرول بالفعل! <:icons8wrong100:1407439999611310130>", ephemeral: true });
      }

      const balance = await getBalance(i.user.id, db);
      if (balance < item.price) {
        return i.reply({ content: ` لا تملك رصيداً كافياً. السعر: ${item.price} <:ryal:1407444550863032330>`, ephemeral: true });
      }

      await subtractBalance(i.user.id, item.price, db);
      await member.roles.add(role).catch(() => {});

      await i.reply({
        content: ` تم شراء الرول: <:icons8correct1001:1407440011183259699> **${item.name}** بمبلغ ${item.price} <:ryal:1407444550863032330> .`,
        ephemeral: true
      });
    }


  });
};
