const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

// Rule-based keyword dictionary for student transactions
const CATEGORY_KEYWORDS = {
  Food: [
    'burger', 'pizza', 'cafe', 'coffee', 'starbucks', 'canteen', 'mess',
    'lunch', 'dinner', 'breakfast', 'snack', 'grocery', 'supermarket',
    'swiggy', 'zomato', 'ubereats', 'doordash', 'subway', 'mcdonalds',
    'restaurant', 'tea', 'boba', 'dining', 'food'
  ],
  Transport: [
    'bus', 'metro', 'train', 'subway', 'taxi', 'uber', 'lyft', 'ola',
    'fuel', 'petrol', 'diesel', 'gas', 'auto', 'fare', 'parking', 'flight',
    'transit', 'commute', 'bike'
  ],
  'Hostel/Rent': [
    'rent', 'hostel', 'room', 'dorm', 'pg', 'landlord', 'electricity',
    'water bill', 'maintenance', 'utility', 'lease', 'apartment'
  ],
  Academics: [
    'book', 'textbook', 'tuition', 'course', 'exam', 'library', 'stationery',
    'pen', 'notebook', 'xerox', 'photocopy', 'college fee', 'admission',
    'udemy', 'coursera', 'lab fee', 'seminar'
  ],
  Subscriptions: [
    'netflix', 'spotify', 'prime', 'youtube', 'disney', 'apple music',
    'hulu', 'icloud', 'google one', 'gym', 'membership', 'chatgpt', 'github'
  ],
  Entertainment: [
    'movie', 'cinema', 'game', 'steam', 'playstation', 'concert', 'party',
    'club', 'bowling', 'outing', 'amusement', 'vacation', 'trip'
  ],
  Allowance: [
    'allowance', 'pocket money', 'parents', 'family', 'monthly allowance',
    'dad', 'mom', 'transfer from parents'
  ],
  'Part-time Job': [
    'salary', 'wage', 'stipend', 'part-time', 'freelance', 'client',
    'shift', 'tutoring', 'internship'
  ],
  Scholarship: [
    'scholarship', 'grant', 'fellowship', 'financial aid', 'bursary'
  ],
  Gift: [
    'gift', 'birthday', 'reward', 'prize', 'cash gift', 'bonus'
  ]
};

/**
 * Suggests category based on transaction description text (rule-based keyword matching)
 * Advisory only - user retains manual override capability.
 */
const suggestCategoryFromDescription = async (description, type = 'expense') => {
  if (!description || typeof description !== 'string') {
    return { suggestedCategory: null, confidence: 0, matchedKeyword: null };
  }

  const cleanText = description.toLowerCase();

  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      // Word boundary or substring check
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(cleanText) || cleanText.includes(kw)) {
        // Find matching category in DB
        const categoryDoc = await Category.findOne({
          name: categoryName,
          type
        });

        return {
          suggestedCategory: categoryDoc ? categoryDoc._id : null,
          suggestedCategoryName: categoryName,
          confidence: 0.85,
          matchedKeyword: kw
        };
      }
    }
  }

  return { suggestedCategory: null, confidence: 0, matchedKeyword: null };
};

/**
 * Checks for possible duplicate transactions (advisory warning only)
 * Matches: same user, same amount, same category, same date (within 24 hrs), similar description
 */
const detectPossibleDuplicate = async (userId, { amount, category, date, description, excludeId }) => {
  try {
    const txDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(txDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(txDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      user: userId,
      amount: Number(amount),
      category: category,
      date: { $gte: startOfDay, $lte: endOfDay }
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const potentialMatches = await Transaction.find(query).limit(3);

    if (potentialMatches.length > 0) {
      const cleanDesc = (description || '').trim().toLowerCase();
      const match = potentialMatches.find((tx) => {
        const existingDesc = (tx.description || '').trim().toLowerCase();
        return (
          existingDesc === cleanDesc ||
          existingDesc.includes(cleanDesc) ||
          cleanDesc.includes(existingDesc)
        );
      });

      if (match) {
        return {
          isDuplicate: true,
          warningMessage: 'Possible duplicate transaction detected with the same amount, category, and date.',
          matchedTransactionId: match._id
        };
      }
    }

    return { isDuplicate: false, warningMessage: null };
  } catch (error) {
    console.error('[Duplicate Detection Error]', error.message);
    return { isDuplicate: false, warningMessage: null };
  }
};

/**
 * Checks if an expense amount is unusually large compared to user's 30-day average (advisory warning)
 */
const detectUnusuallyLargeTransaction = async (userId, amount, type = 'expense') => {
  if (type !== 'expense') {
    return { isLarge: false, warningMessage: null };
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0 && stats[0].count >= 1) {
      const avg = stats[0].avgAmount;
      // If amount is more than 2.5x the 30-day average and at least 100
      if (Number(amount) >= avg * 2.5 && Number(amount) >= 100) {
        return {
          isLarge: true,
          avgAmount: Math.round(avg),
          warningMessage: `Notice: This expense ($${amount}) is significantly higher than your recent 30-day average ($${Math.round(avg)}).`
        };
      }
    }

    return { isLarge: false, warningMessage: null };
  } catch (error) {
    console.error('[Large Transaction Detection Error]', error.message);
    return { isLarge: false, warningMessage: null };
  }
};

module.exports = {
  suggestCategoryFromDescription,
  detectPossibleDuplicate,
  detectUnusuallyLargeTransaction
};
