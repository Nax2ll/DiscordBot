// 📁 /shop/punishments.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { getBalance, subtractBalance, setBalance } = require("./utils");

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

  console.log("📥 دخل قسم العقوبات:", { id, value });

  // واجهة العقوبات الرئيسية
  if (
    id === "section_punishments" ||
    value === "section_punishments" ||
    (id === "shop_section_select" && value === "section_punishments")
  ) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId("punishments_menu")
      .setPlaceholder("اختر نوع العقوبة")
      .addOptions([
        { label: "⏱️ تايم أوت 5 دقائق", value: "timeout_action" },
        { label: "🔇 كتم لمدة 5 دقائق", value: "mute_action" },
        { label: "💸 خصم عشوائي من الرصيد", value: "steal_action" },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle("⚠️ قسم العقوبات")
          .setDescription("اختر نوع العقوبة التي تريد تطبيقها")
          .setImage("https://yourdomain.com/images/punishments.jpg")
          .setColor("Orange")
      ],
      components: [row]
    });
  }

  const actions = {
    timeout_action: {
      title: "⏱️ تايم أوت",
      price: timeoutPrice,
      buttonId: "confirm_timeout"
    },
    mute_action: {
      title: "🔇 كتم",
      price: mutePrice,
      buttonId: "confirm_mute"
    },
    steal_action: {
      title: "💸 خصم عشوائي",
      price: stealPrice,
      buttonId: "confirm_steal"
    }
  };

  if (id === "punishments_menu" && actions[value]) {
    const action = actions[value];

    console.log("📦 تم اختيار العقوبة:", value);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("shop_back").setLabel("↩️ العودة").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(action.buttonId).setLabel("✅ تأكيد العقوبة").setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle(action.title)
          .setDescription("منشن الشخص المطلوب معاقبته خلال دقيقة ثم اضغط تأكيد")
          .setColor("Red")
      ],
      components: [row]
    });

    const filter = (m) => m.author.id === userId && m.mentions.members.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });

    collector.on("collect", async (message) => {
      const target = message.mentions.members.first();
      if (!target || target.user.bot || target.id === userId) {
        return message.reply("❌ لا يمكنك معاقبة هذا الشخص.");
      }
      console.log("📌 تم منشن الشخص:", target.id);
      targetMap.set(userId, { id: target.id, action: value });
      const reply = await message.reply(`✅ تم حفظ <@${target.id}>. اضغط تأكيد لتطبيق العقوبة.`);
      setTimeout(() => reply.delete().catch(() => {}), 5000);
      setTimeout(() => message.delete().catch(() => {}), 100);
    });
  }

  const executeAction = async (actionKey, interaction) => {
    console.log("🚨 تنفيذ العقوبة:", actionKey);
    const data = targetMap.get(userId);
    if (!data || data.action !== actionKey) {
      console.log("❌ لم يتم العثور على المنشن الصحيح.");
      return interaction.reply({ content: "❌ لم يتم منشن أحد.", ephemeral: true });
    }

    const target = await guild.members.fetch(data.id).catch(() => null);
    if (!target) {
      console.log("❌ العضو غير موجود في السيرفر:", data.id);
      return interaction.reply({ content: "❌ لم يتم العثور على العضو.", ephemeral: true });
    }

    const userBalance = await getBalance(userId, db);
    const price = actions[actionKey].price;
    if (userBalance < price) {
      console.log("❌ الرصيد غير كافٍ:", userBalance);
      return interaction.reply({ content: `❌ رصيدك غير كافٍ. السعر: ${price}`, ephemeral: true });
    }

    await subtractBalance(userId, price, db);

    let response = "";
    if (actionKey === "timeout_action") {
      console.log("🕒 إعطاء تايم أوت لـ:", target.id);
      await target.timeout(5 * 60 * 1000).catch(err => console.log("تايم أوت خطأ:", err));
      response = `⏱️ تم إعطاء <@${target.id}> تايم أوت لمدة 5 دقائق.`;
    } else if (actionKey === "mute_action") {
      console.log("🔇 إضافة رول ميوت لـ:", target.id);
      await target.roles.add(muteRoleId).catch(err => console.log("رول ميوت خطأ:", err));
      setTimeout(() => {
        target.roles.remove(muteRoleId).catch(err => console.log("إزالة رول ميوت خطأ:", err));
      }, 5 * 60 * 1000);
      response = `🔇 تم كتم <@${target.id}> لمدة 5 دقائق.`;
    } else if (actionKey === "steal_action") {
      const targetBalance = await getBalance(target.id, db);
      const amount = Math.floor(Math.random() * targetBalance);
      console.log("💸 خصم عشوائي من:", target.id, "بقيمة:", amount);
      await subtractBalance(target.id, amount, db);
      response = `💸 تم خصم ${amount} كاش من <@${target.id}>!`;
    }

    const reply = await interaction.reply({ content: response });
    setTimeout(() => reply.delete().catch(() => {}), 5000);
    targetMap.delete(userId);
  };

  if (id === "confirm_timeout") return executeAction("timeout_action", interaction);
  if (id === "confirm_mute") return executeAction("mute_action", interaction);
  if (id === "confirm_steal") return executeAction("steal_action", interaction);

  if (id === "shop_back") return interaction.message.delete().catch(() => {});
}
