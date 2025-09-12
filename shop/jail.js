// 📁 /shop/jail.js
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { getBalance, subtractBalance } = require("./utils");

const jailRoleId = "1393698313710207038";
const visitorRoleId = "1393698552122835104";
const jailPrice = 5000;
const bailPrice = 10000;
const visitPrice = 2500;
const boosterRoleId = "1360742955735974030"; // 🎖️ استثناء البوستر

const jailTargetMap = new Map();
const bailTargetMap = new Map();

module.exports = async function handleJail(interaction, db) {
  const userId = interaction.user.id;
  const guild = interaction.guild;
  const id = interaction.customId;
  const value = interaction.values?.[0];

  // ✅ قسم السجن
  if (
    id === "section_jail" ||
    value === "section_jail" ||
    (id === "shop_section_select" && value === "section_jail")
  ) {
    const jailMenu = new StringSelectMenuBuilder()
      .setCustomId("jail_menu")
      .setPlaceholder("اختر نوع الإجراء")
      .addOptions([
        { label: " سجن مواطن", value: "jail_action", description: `السعر: ${jailPrice.toLocaleString("en-US")} ريال`, emoji: { id: "1409306733897318410", animated: false } },
        { label: " كفالة مواطن", value: "bail_action", description: `السعر: ${bailPrice.toLocaleString("en-US")} ريال`, emoji: { id: "1409319250711154728", animated: false } },
        { label: " زيارة سجين", value: "visit_action", description: `السعر: ${visitPrice.toLocaleString("en-US")} ريال`, emoji: { id: "1409319242217558096", animated: false } },
      ]);

    const row = new ActionRowBuilder().addComponents(jailMenu);

    return interaction.update({
      files: ["./assets/templates/Prison.png"],
      components: [row],
      embeds: []
    });
  }

  // ✅ زر العودة
  if (id === "shop_back") {
    return interaction.message.delete().catch(() => {});
  }

  // ✅ سجن مواطن
  if (id === "jail_menu" && value === "jail_action") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("shop_back").setLabel(" العودة").setStyle(ButtonStyle.Secondary).setEmoji("1407426312603439226"),
      new ButtonBuilder().setCustomId("confirm_mention_jail").setLabel(" تأكيد السجن").setStyle(ButtonStyle.Secondary).setEmoji("1415979896433278986")
    );

    await interaction.update({
      files: ["./assets/templates/Jail.png"],
      components: [row],
      embeds: []
    });

    const filter = (m) => m.author.id === userId && m.mentions.members.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });

    collector.on("collect", async (message) => {
      const target = message.mentions.members.first();
      if (!target || target.user.bot || target.id === userId) {
        return message.reply(" لا يمكنك سجن هذا الشخص. <:icons8wrong1001:1415979909825695914>");
      }
      jailTargetMap.set(userId, target.id);
      const reply = await message.reply(` تم حفظ <@${target.id}>. اضغط تأكيد لإتمام السجن. <:icons8correct1002:1415979896433278986>`);
      setTimeout(() => reply.delete().catch(() => {}), 5000);
      setTimeout(() => message.delete().catch(() => {}), 100);
    });
  }

  // ✅ تأكيد تنفيذ السجن
  if (id === "confirm_mention_jail") {
    const targetId = jailTargetMap.get(userId);
    if (!targetId) {
      return interaction.reply({ content: " لم يتم منشن أي شخص. <:icons8wrong1001:1415979909825695914>", ephemeral: true });
    }

    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) {
      return interaction.reply({ content: " لم يتم العثور على العضو. <:icons8wrong1001:1415979909825695914>", ephemeral: true });
    }

    const balance = await getBalance(userId, db);
    if (balance < jailPrice) {
      return interaction.reply({ content: ` لا تملك كاش كافي. السعر: <:icons8wrong1001:1415979909825695914> ${jailPrice}`, ephemeral: true });
    }

    const rolesToRemove = target.roles.cache
      .filter(r => r.id !== guild.id && r.id !== jailRoleId && r.id !== boosterRoleId)
      .map(r => r.id);

    await db.collection("prisoner_users").insertOne({ userId: target.id, roles: rolesToRemove });
    await subtractBalance(userId, jailPrice, db);
    await target.roles.remove(rolesToRemove).catch(() => {});
    await target.roles.add(jailRoleId).catch(() => {});

    await interaction.reply({ content: ` تم سجن <@${target.id}> لمدة 5 دقائق! <:icons8arrest100:1409306733897318410>` });

    jailTargetMap.delete(userId);

    setTimeout(async () => {
      const record = await db.collection("prisoner_users").findOne({ userId: target.id });
      if (!record) return;

      // أولاً: استرجاع الأدوار المحفوظة
      const rolesToRestore = record.roles.filter(r => r !== boosterRoleId);
      if (rolesToRestore.length > 0) {
        await target.roles.add(rolesToRestore).catch(() => {});
      }

      // ثانياً: إزالة رول السجن
      await target.roles.remove(jailRoleId).catch(() => {});

      await db.collection("prisoner_users").deleteOne({ userId: target.id });
      await interaction.channel.send({ content: ` انتهت مدة سجن <@${target.id}> وتم إطلاق سراحه. <:icons8timeout100:1409299705371955240>` });
    }, 5 * 60 * 1000);
  }

  // ✅ كفالة مواطن
  if (id === "jail_menu" && value === "bail_action") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("shop_back").setLabel(" العودة").setStyle(ButtonStyle.Secondary).setEmoji("1407426312603439226"),
      new ButtonBuilder().setCustomId("confirm_mention_bail").setLabel(" تأكيد الكفالة").setStyle(ButtonStyle.Secondary).setEmoji("1415979896433278986")
    );

    await interaction.update({
      files: ["./assets/templates/Bail.png"],
      components: [row],
      embeds: []
    });

    const filter = (m) => m.author.id === userId && m.mentions.members.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });

    collector.on("collect", async (message) => {
      const target = message.mentions.members.first();
      if (!target || target.user.bot || target.id === userId || !target.roles.cache.has(jailRoleId)) {
        return message.reply(" هذا الشخص غير مسجون. <:icons8wrong1001:1415979909825695914>");
      }
      bailTargetMap.set(userId, target.id);
      const reply = await message.reply(` تم حفظ <@${target.id}>. اضغط تأكيد لإتمام الكفالة. <:icons8correct1002:1415979896433278986>`);
      setTimeout(() => reply.delete().catch(() => {}), 5000);
      setTimeout(() => message.delete().catch(() => {}), 100);
    });
  }

  // ✅ تنفيذ الكفالة
  if (id === "confirm_mention_bail") {
    const targetId = bailTargetMap.get(userId);
    if (!targetId) {
      return interaction.reply({ content: " لم يتم منشن أي شخص. <:icons8wrong1001:1415979909825695914>", ephemeral: true });
    }

    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) {
      return interaction.reply({ content: " لم يتم العثور على العضو. <:icons8wrong1001:1415979909825695914>", ephemeral: true });
    }

    const balance = await getBalance(userId, db);
    if (balance < bailPrice) {
      return interaction.reply({ content: ` لا تملك كاش كافي. السعر: <:icons8wrong1001:1415979909825695914> ${bailPrice}`, ephemeral: true });
    }

    const record = await db.collection("prisoner_users").findOne({ userId: target.id });
    if (!record) {
      return interaction.reply({ content: " لا يوجد بيانات لهذا السجين. <:icons8wrong1001:1415979909825695914>", ephemeral: true });
    }

    await subtractBalance(userId, bailPrice, db);

    // أولاً: استرجاع الأدوار المحفوظة
    const rolesToRestore = record.roles.filter(r => r !== boosterRoleId);
    if (rolesToRestore.length > 0) {
      await target.roles.add(rolesToRestore).catch(() => {});
    }

    // ثانياً: إزالة رول السجن
    await target.roles.remove(jailRoleId).catch(() => {});

    await db.collection("prisoner_users").deleteOne({ userId: target.id });

    await interaction.reply({ content: ` تم كفالة <@${target.id}> بنجاح! <:icons8bail100:1409319250711154728>` });

    bailTargetMap.delete(userId);
  }

  // ✅ زيارة سجين
  if (id === "jail_menu" && value === "visit_action") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("shop_back").setLabel(" العودة").setStyle(ButtonStyle.Secondary).setEmoji("1407426312603439226"),
      new ButtonBuilder().setCustomId("confirm_visit").setLabel(" تأكيد الزيارة").setStyle(ButtonStyle.Secondary).setEmoji("1415979896433278986")
    );

    await interaction.update({
      files: ["./assets/templates/Visit.png"],
      components: [row],
      embeds: []
    });
  }

  if (id === "confirm_visit") {
    const balance = await getBalance(userId, db);
    if (balance < visitPrice) {
      return interaction.reply({ content: ` لا تملك كاش كافي. السعر: <:icons8wrong1001:1415979909825695914> ${visitPrice}`, ephemeral: true });
    }

    const member = await guild.members.fetch(userId);
    await subtractBalance(userId, visitPrice, db);
    await member.roles.add(visitorRoleId).catch(() => {});
    await interaction.reply({ content: ` تم منحك صلاحية زيارة السجن لمدة 5 دقائق. <:icons8meeting100:1409319242217558096>` });

    setTimeout(async () => {
      await member.roles.remove(visitorRoleId).catch(() => {});
    }, 5 * 60 * 1000);
  }
};
