// 📁 /shop/utils.js

// ✅ جلب الأغراض من قسم معين
async function getShopItems(section, db) {
  return await db.collection("shop_items").find({ section }).toArray();
}

// ✅ جلب مخزون المستخدم
async function getUserInventory(userId, db) {
  const user = await db.collection("user_items").findOne({ userId });
  return user?.items || {};
}

// ✅ التحقق من إمكانية الشراء
async function canBuyItem(userId, item, db) {
  const balance = await getBalance(userId, db);
  if (balance < item.price) return { ok: false, reason: " رصيدك لا يكفي.<:icons8wrong100:1407439999611310130>" };
  if (item.stock <= 0) return { ok: false, reason: " الغرض غير متوفر حالياً.<:icons8wrong100:1407439999611310130>" };

  const inventory = await getUserInventory(userId, db);
  const owned = inventory[item.itemId] || 0;
  if (owned >= item.maxPerUser) return { ok: false, reason: " لا يمكنك شراء أكثر من نسخة.<:icons8wrong100:1407439999611310130>" };

  return { ok: true };
}

// ✅ تنفيذ الشراء
async function buyItem(userId, item, db) {
  await subtractBalance(userId, item.price, db);
  await db.collection("shop_items").updateOne({ itemId: item.itemId }, { $inc: { stock: -1 } });
  await db.collection("user_items").updateOne(
    { userId },
    { $inc: { [`items.${item.itemId}`]: 1 } },
    { upsert: true }
  );
}

// ✅ جلب الرصيد
async function getBalance(userId, db) {
  const user = await db.collection("users").findOne({ userId: String(userId) });
  if (!user) return 0;
  return user.wallet || 0;
}

// ✅ خصم الرصيد
async function subtractBalance(userId, amount, db) {
  await db.collection("users").updateOne(
    { userId: String(userId) },
    { $inc: { wallet: -Math.abs(amount) } },
    { upsert: true }
  );
}

module.exports = {
  getShopItems,
  getUserInventory,
  canBuyItem,
  buyItem,
  getBalance,
  subtractBalance
};
