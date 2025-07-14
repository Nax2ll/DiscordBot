// 📁 /shop/jail.js
const {
  EmbedBuilder,
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

  // ✅ عند اختيار قسم السجن
  if (
    id === "section_jail" ||
    value === "section_jail" ||
    (id === "shop_section_select" && value === "section_jail")
  ) {
    const jailMenu = new StringSelectMenuBuilder()
      .setCustomId("jail_menu")
      .setPlaceholder("اختر نوع الإجراء")
      .addOptions([
        { label: "🚔 سجن مواطن", value: "jail_action" },
        { label: "💸 كفالة مواطن", value: "bail_action" },
        { label: "🤝 زيارة سجين", value: "visit_action" },
      ]);

    const row = new ActionRowBuilder().addComponents(jailMenu);

    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚔 قسم السجن")
          .setDescription("اختر أحد الخيارات أدناه")
          .setImage("https://yourdomain.com/images/jail.jpg")
          .setColor("DarkRed")
      ],
      components: [row]
    });
  }

  // ✅ زر العودة يحذف الرسالة مباشرة
  if (id === "shop_back") {
    return interaction.message.delete().catch(() => {});
  }

  // ✅ عرض واجهة سجن مواطن
  if (id === "jail_menu" && value === "jail_action") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("shop_back").setLabel("↩️ العودة").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("confirm_mention_jail").setLabel("✅ تأكيد السجن").setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚔 سجن مواطن")
          .setDescription("قم بمنشن الشخص الذي تريد سجنه في رسالة خلال دقيقة، ثم اضغط زر تأكيد.")
          .setImage("https://yourdomain.com/images/jail-user.jpg")
          .setColor("Red")
      ],
      components: [row]
    });

    const filter = (m) => m.author.id === userId && m.mentions.members.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });

    collector.on("collect", async (message) => {
      const target = message.mentions.members.first();
      if (!target || target.user.bot || target.id === userId) {
        return message.reply("❌ لا يمكنك سجن هذا الشخص.");
      }
      jailTargetMap.set(userId, target.id);
      const reply = await message.reply(`✅ تم حفظ <@${target.id}>. اضغط تأكيد لإتمام السجن.`);
      setTimeout(() => reply.delete().catch(() => {}), 5000);
      setTimeout(() => message.delete().catch(() => {}), 100);
    });
  }

  // ✅ تأكيد تنفيذ السجن
  if (id === "confirm_mention_jail") {
    const targetId = jailTargetMap.get(userId);
    if (!targetId) {
      return interaction.reply({ content: "❌ لم يتم منشن أي شخص.", ephemeral: true });
    }

    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) {
      return interaction.reply({ content: "❌ لم يتم العثور على العضو.", ephemeral: true });
    }

    const balance = await getBalance(userId, db);
    if (balance < jailPrice) {
      return interaction.reply({ content: `❌ لا تملك كاش كافي. السعر: ${jailPrice}`, ephemeral: true });
    }

    const rolesToRemove = target.roles.cache
      .filter(r => r.id !== guild.id && r.id !== jailRoleId && r.id !== boosterRoleId)
      .map(r => r.id);
    await db.collection("prisoner_users").insertOne({ userId: target.id, roles: rolesToRemove });
    await subtractBalance(userId, jailPrice, db);
    await target.roles.remove(rolesToRemove).catch(() => {});
    await target.roles.add(jailRoleId).catch(() => {});

    const reply = await interaction.reply({ content: `🚔 تم سجن <@${target.id}> لمدة 5 دقائق!` });
    setTimeout(() => reply.delete().catch(() => {}), 5000);

    jailTargetMap.delete(userId);

    setTimeout(async () => {
      const record = await db.collection("prisoner_users").findOne({ userId: target.id });
      if (!record) return;
      await target.roles.remove(jailRoleId).catch(() => {});
      const rolesToRestore = record.roles.filter(r => r !== boosterRoleId);
      if (rolesToRestore.length > 0) {
        await target.roles.add(rolesToRestore).catch(() => {});
      }
      await db.collection("prisoner_users").deleteOne({ userId: target.id });
    await interaction.channel.send({ content: `💸 تم إطلاق سراح <@${target.id}> بالكفالة.` });
      await interaction.channel.send({ content: `⏱️ انتهت مدة سجن <@${target.id}> وتم إطلاق سراحه.` });
    }, 5 * 60 * 1000);
  }

  // ✅ عرض واجهة كفالة مواطن
  if (id === "jail_menu" && value === "bail_action") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("shop_back").setLabel("↩️ العودة").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("confirm_mention_bail").setLabel("✅ تأكيد الكفالة").setStyle(ButtonStyle.Success)
    );

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle("💸 كفالة مواطن")
          .setDescription("منشن الشخص اللي تبي تكفله برسالة خلال دقيقة، ثم اضغط تأكيد.")
          .setImage("https://yourdomain.com/images/bail.jpg")
          .setColor("Green")
      ],
      components: [row]
    });

    const filter = (m) => m.author.id === userId && m.mentions.members.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });

    collector.on("collect", async (message) => {
      const target = message.mentions.members.first();
      if (!target || target.user.bot || target.id === userId || !target.roles.cache.has(jailRoleId)) {
        return message.reply("❌ هذا الشخص غير مسجون.");
      }
      bailTargetMap.set(userId, target.id);
      const reply = await message.reply(`✅ تم حفظ <@${target.id}>. اضغط تأكيد لإتمام الكفالة.`);
      setTimeout(() => reply.delete().catch(() => {}), 5000);
      setTimeout(() => message.delete().catch(() => {}), 100);
    });
  }

  // ✅ تنفيذ الكفالة
  if (id === "confirm_mention_bail") {
    const targetId = bailTargetMap.get(userId);
    if (!targetId) {
      return interaction.reply({ content: "❌ لم يتم منشن أي شخص.", ephemeral: true });
    }

    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) {
      return interaction.reply({ content: "❌ لم يتم العثور على العضو.", ephemeral: true });
    }

    const balance = await getBalance(userId, db);
    if (balance < bailPrice) {
      return interaction.reply({ content: `❌ لا تملك كاش كافي. السعر: ${bailPrice}`, ephemeral: true });
    }

    const record = await db.collection("prisoner_users").findOne({ userId: target.id });
    if (!record) {
      return interaction.reply({ content: "❌ لا يوجد بيانات لهذا السجين.", ephemeral: true });
    }

    await subtractBalance(userId, bailPrice, db);
    await target.roles.remove(jailRoleId).catch(() => {});
    const rolesToRestore = record.roles.filter(r => r !== boosterRoleId);
    if (rolesToRestore.length > 0) {
      await target.roles.add(rolesToRestore).catch(() => {});
    }
    // ✅ تأكد من إزالة رول البريزونر نهائيًا
    await target.roles.remove(jailRoleId).catch(() => {});
    await db.collection("prisoner_users").deleteOne({ userId: target.id });

    const reply = await interaction.reply({ content: `💸 تم كفالة <@${target.id}> بنجاح!` });
    setTimeout(() => reply.delete().catch(() => {}), 5000);

    bailTargetMap.delete(userId);
  }

  // ✅ زيارة سجين
  if (id === "jail_menu" && value === "visit_action") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("shop_back").setLabel("↩️ العودة").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("confirm_visit").setLabel("✅ تأكيد الزيارة").setStyle(ButtonStyle.Primary)
    );

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle("🤝 زيارة سجين")
          .setDescription("هل أنت متأكد أنك تريد زيارة السجن؟")
          .setImage("https://yourdomain.com/images/visit.jpg")
          .setColor("Blurple")
      ],
      components: [row]
    });
  }

  if (id === "confirm_visit") {
    const balance = await getBalance(userId, db);
    if (balance < visitPrice) {
      return interaction.reply({ content: `❌ لا تملك كاش كافي. السعر: ${visitPrice}`, ephemeral: true });
    }

    const member = await guild.members.fetch(userId);
    await subtractBalance(userId, visitPrice, db);
    await member.roles.add(visitorRoleId).catch(() => {});
    const reply = await interaction.reply({ content: `🤝 تم منحك صلاحية زيارة السجن لمدة 5 دقائق.` });
    setTimeout(() => reply.delete().catch(() => {}), 5000);

    setTimeout(async () => {
      await member.roles.remove(visitorRoleId).catch(() => {});
    }, 5 * 60 * 1000);
  }
};

