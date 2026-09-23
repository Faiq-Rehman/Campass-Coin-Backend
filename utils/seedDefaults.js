const Category = require('../models/Category');
const Admin = require('../models/Admin');

const defaultCategories = [
  // Default Income Categories
  { name: 'Allowance', type: 'income', isDefault: true, icon: 'wallet', color: '#10b981' },
  { name: 'Part-time Job', type: 'income', isDefault: true, icon: 'briefcase', color: '#06b6d4' },
  { name: 'Scholarship', type: 'income', isDefault: true, icon: 'award', color: '#8b5cf6' },
  { name: 'Gift', type: 'income', isDefault: true, icon: 'gift', color: '#ec4899' },
  { name: 'Other Income', type: 'income', isDefault: true, icon: 'plus-circle', color: '#64748b' },

  // Default Expense Categories
  { name: 'Food', type: 'expense', isDefault: true, icon: 'utensils', color: '#f59e0b' },
  { name: 'Transport', type: 'expense', isDefault: true, icon: 'bus', color: '#3b82f6' },
  { name: 'Hostel/Rent', type: 'expense', isDefault: true, icon: 'home', color: '#6366f1' },
  { name: 'Academics', type: 'expense', isDefault: true, icon: 'book', color: '#84cc16' },
  { name: 'Subscriptions', type: 'expense', isDefault: true, icon: 'tv', color: '#ef4444' },
  { name: 'Entertainment', type: 'expense', isDefault: true, icon: 'film', color: '#a855f7' },
  { name: 'Miscellaneous', type: 'expense', isDefault: true, icon: 'tag', color: '#64748b' }
];

/**
 * Idempotently seeds default categories and initial admin
 */
const seedDefaults = async () => {
  try {
    // 1. Seed Categories
    for (const cat of defaultCategories) {
      const existing = await Category.findOne({
        name: cat.name,
        type: cat.type,
        isDefault: true,
        user: null
      });

      if (!existing) {
        await Category.create({ ...cat, user: null });
      }
    }
    console.log('[Seed] Default categories verified.');

    // 2. Seed Admin from Environment Variables (.env)
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.log('[Seed] ADMIN_USERNAME or ADMIN_PASSWORD not set in .env. Skipping admin creation.');
      return;
    }

    const adminExists = await Admin.findOne({ username: adminUsername.toLowerCase() });
    if (!adminExists) {
      await Admin.create({
        username: adminUsername.toLowerCase(),
        password: adminPassword // Automatically hashed with bcrypt before saving to MongoDB
      });
      console.log(`[Seed] Admin account "${adminUsername}" created in MongoDB.`);
    } else {
      console.log(`[Seed] Admin user "${adminUsername}" already exists in MongoDB.`);
    }
  } catch (error) {
    console.error('[Seed Error] Failed to seed default data:', error.message);
  }
};

module.exports = seedDefaults;
