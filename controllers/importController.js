const path = require('path');
const multer = require('multer');
const { processCSVImport } = require('../services/csvImportService');

// Multer disk storage for CSV imports
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files (.csv) are accepted for transaction import.'));
    }
  }
});

/**
 * @desc    Upload and import transactions from CSV
 * @route   POST /api/import/transactions
 * @access  Private (Student)
 */
const importTransactions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a valid CSV file'
      });
    }

    const { importedCount, skippedCount, errors } = await processCSVImport(
      req.file.path,
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: `CSV import completed: ${importedCount} transaction(s) imported, ${skippedCount} skipped.`,
      data: {
        importedCount,
        skippedCount,
        errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while importing CSV'
    });
  }
};

module.exports = {
  upload,
  importTransactions
};
