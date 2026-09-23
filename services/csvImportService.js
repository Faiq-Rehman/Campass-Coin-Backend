const fs = require('fs');
const csv = require('csv-parser');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

/**
 * Parses and processes CSV transactions for a specific authenticated student
 * @param {string} filePath - Absolute path to uploaded CSV file
 * @param {ObjectId} userId - Authenticated user's ID
 * @returns {Promise<{ importedCount: number, skippedCount: number, errors: Array }>}
 */
const processCSVImport = async (filePath, userId) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    let rowNumber = 1; // Row 1 is header

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        const requiredHeaders = ['amount', 'type', 'category', 'description'];
        const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
        const missing = requiredHeaders.filter((rh) => !normalizedHeaders.includes(rh));

        if (missing.length > 0) {
          errors.push({
            row: 1,
            message: `Missing required CSV column headers: ${missing.join(', ')}. Required headers are: amount, type, category, description, and optional date.`
          });
        }
      })
      .on('data', (row) => {
        rowNumber++;
        results.push({ row, rowNumber });
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('end', async () => {
        // If header validation failed, stop here
        if (errors.length > 0) {
          // Cleanup file
          try { fs.unlinkSync(filePath); } catch (e) {}
          return resolve({ importedCount: 0, skippedCount: results.length, errors });
        }

        let importedCount = 0;
        let skippedCount = 0;

        // Fetch user & default categories into memory for efficient matching
        const userCategories = await Category.find({
          $or: [{ user: userId }, { isDefault: true }]
        });

        for (const item of results) {
          const rawRow = item.row;
          const currentLine = item.rowNumber;

          // Normalize keys
          const cleanRow = {};
          Object.keys(rawRow).forEach((k) => {
            cleanRow[k.trim().toLowerCase()] = rawRow[k] ? rawRow[k].trim() : '';
          });

          const rawAmount = cleanRow['amount'];
          const rawType = cleanRow['type'] ? cleanRow['type'].toLowerCase() : '';
          const rawCategory = cleanRow['category'];
          const rawDescription = cleanRow['description'];
          const rawDate = cleanRow['date'];

          // 1. Validate Amount
          const amount = parseFloat(rawAmount);
          if (isNaN(amount) || amount <= 0) {
            errors.push({ row: currentLine, message: `Invalid amount "${rawAmount}". Must be a positive number.` });
            skippedCount++;
            continue;
          }

          // 2. Validate Type
          if (rawType !== 'income' && rawType !== 'expense') {
            errors.push({ row: currentLine, message: `Invalid type "${rawType}". Must be either "income" or "expense".` });
            skippedCount++;
            continue;
          }

          // 3. Validate Description
          if (!rawDescription) {
            errors.push({ row: currentLine, message: 'Description cannot be empty.' });
            skippedCount++;
            continue;
          }

          // 4. Validate Date
          let txDate = new Date();
          if (rawDate) {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) {
              txDate = parsed;
            } else {
              errors.push({ row: currentLine, message: `Invalid date format "${rawDate}". Using current date.` });
            }
          }

          // 5. Match or Auto-Create Category
          let matchedCategory = userCategories.find(
            (c) => c.name.toLowerCase() === rawCategory.toLowerCase() && c.type === rawType
          );

          if (!matchedCategory) {
            try {
              // Create user custom category
              matchedCategory = await Category.create({
                name: rawCategory || (rawType === 'income' ? 'Other Income' : 'Miscellaneous'),
                type: rawType,
                user: userId,
                isDefault: false
              });
              userCategories.push(matchedCategory);
            } catch (err) {
              // Fallback to default
              matchedCategory = userCategories.find(
                (c) => c.name === (rawType === 'income' ? 'Other Income' : 'Miscellaneous')
              );
            }
          }

          try {
            await Transaction.create({
              user: userId,
              category: matchedCategory._id,
              amount,
              type: rawType,
              description: rawDescription,
              date: txDate,
              isRecurring: false
            });
            importedCount++;
          } catch (createErr) {
            errors.push({ row: currentLine, message: `Database error: ${createErr.message}` });
            skippedCount++;
          }
        }

        // Clean up uploaded file
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          console.error('[CSV Cleanup Error]', cleanupErr.message);
        }

        resolve({ importedCount, skippedCount, errors });
      });
  });
};

module.exports = { processCSVImport };
