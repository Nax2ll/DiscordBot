const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require("discord.js");
const { getBalance, subtractBalance } = require("./utils");

const timeoutPrice = 50000;
const mutePrice = 30000;
const stealPrice = 25000;
const muteRoleId = "1393698797170724874";

const targetMap = new Map();

module.exports = async function handlePunishments(interaction, db) {
  const id = interaction.customId;
  const value = interaction.values?.[0];
  const userId = interaction.user.id;
  const guild = interaction.guild;

  // 📥 الواجهة الرئيسية للعقوبات
  if (
    id === "section_punishments" ||
    value === "section_punishments" ||
    (id === "shop_section_select" && value === "section_punishments")
  ) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId("punishments_menu")
      .setPlaceholder("اختر نوع العقوبة")
      .addOptions([
        { label: " تايم أوت 5 دقائق", value: "timeout_action", description: `السعر: ${timeoutPrice.toLocaleString("en-US")} ريال` ,emoji: { id: "1409299705371955240", animated: false } },
        { label: " كتم لمدة 5 دقائق", value: "mute_action",description: `السعر: ${mutePrice.toLocaleString("en-US")} ريال`, emoji: { id: "1409299716813881456", animated: false } },
        { label: " خصم عشوائي من الرصيد", value: "steal_action",description: `السعر: ${stealPrice.toLocaleString("en-US")} ريال`, emoji: { id: "1409298360090886224", animated: false } },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    const img = new AttachmentBuilder("./assets/templates/Punishment.png", { name: "Punishment.png" });

    return interaction.update({
      files: [img],
      components: [row]
    });
  }

  const actions = {
    timeout_action: {
      title: " تايم أوت <:icons8timeout100:1409299705371955240>",
      price: timeoutPrice,
      buttonId: "confirm_timeout"
    },
    mute_action: {
      title: " كتم <:icons8mute100:1409299716813881456>",
      price: mutePrice,
      buttonId: "confirm_mute"
    },
    steal_action: {
      title: "خصم عشوائي <:icons8moneyloss100:1409298360090886224>",
      price: stealPrice,
      buttonId: "confirm_steal"
    }
  };

if (id === "punishments_menu" && actions[value]) {
  const action = actions[value];

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("shop_back").setLabel(" العودة").setStyle(ButtonStyle.Secondary).setEmoji("1407426312603439226"),
    new ButtonBuilder().setCustomId(action.buttonId).setLabel(" تأكيد العقوبة").setStyle(ButtonStyle.Secondary).setEmoji("1415979896433278986")
  );

  const img = new AttachmentBuilder("./assets/templates/Punishment.png", { name: "Punishment.png" });

  // ✨ Embed تحت الصورة للتوضيح
  const embed = {
    title: action.title,
    description: "<:usersolidfull:1407422287652720750> قم بمنشن الشخص المطلوب معاقبته خلال دقيقة ثم اضغط على زر **تأكيد العقوبة**.",
    color: 0xff0000
  };

  await interaction.update({
    files: [img],
    embeds: [embed],
    components: [row]
  });

  const filter = (m) => m.author.id === userId && m.mentions.members.size > 0;
  const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });

  collector.on("collect", async (message) => {
    const target = message.mentions.members.first();
    if (!target || target.user.bot || target.id === userId) {
      return message.reply(" لا يمكنك معاقبة هذا الشخص.<:icons8wrong1001:1415979909825695914>");
    }
    targetMap.set(userId, { id: target.id, action: value });
    const reply = await message.reply(` تم حفظ <@${target.id}>. اضغط تأكيد لتطبيق العقوبة. <:icons8correct1002:1415979896433278986>`);
    setTimeout(() => reply.delete().catch(() => {}), 5000);
    setTimeout(() => message.delete().catch(() => {}), 100);
  });
}

  const executeAction = async (actionKey, interaction) => {
    const data = targetMap.get(userId);
    if (!data || data.action !== actionKey) {
      return interaction.reply({ content: " لم يتم منشن أحد.<:icons8wrong1001:1415979909825695914>", ephemeral: true });
    }

    const target = await guild.members.fetch(data.id).catch(() => null);
    if (!target) {
      return interaction.reply({ content: " لم يتم العثور على العضو.<:icons8wrong1001:1415979909825695914>", ephemeral: true });
    }

    const userBalance = await getBalance(userId, db);
    const price = actions[actionKey].price;
    if (userBalance < price) {
      return interaction.reply({ content: ` رصيدك غير كافٍ. السعر:<:icons8wrong1001:1415979909825695914> ${price}`, ephemeral: true });
    }

    await subtractBalance(userId, price, db);

    let response = "";
    if (actionKey === "timeout_action") {
      await target.timeout(5 * 60 * 1000).catch(() => {});
      response = ` تم إعطاء <@${target.id}> تايم أوت لمدة 5 دقائق.<:icons8timeout100:1409299705371955240>`;
    } else if (actionKey === "mute_action") {
      await target.roles.add(muteRoleId).catch(() => {});
      setTimeout(() => target.roles.remove(muteRoleId).catch(() => {}), 5 * 60 * 1000);
      response = ` تم كتم <@${target.id}> لمدة 5 دقائق.<:icons8mute100:1409299716813881456>`;
    } else if (actionKey === "steal_action") {
      const targetBalance = await getBalance(target.id, db);
      const amount = Math.floor(Math.random() * targetBalance);
      await subtractBalance(target.id, amount, db);
      response = ` تم خصم ${amount} كاش من <@${target.id}>!<:icons8moneyloss100:1409298360090886224>`;
    }

    const reply = await interaction.reply({ content: response });
    setTimeout(() => reply.delete().catch(() => {}), 5000);
    targetMap.delete(userId);
  };

  if (id === "confirm_timeout") return executeAction("timeout_action", interaction);
  if (id === "confirm_mute") return executeAction("mute_action", interaction);
  if (id === "confirm_steal") return executeAction("steal_action", interaction);
};
