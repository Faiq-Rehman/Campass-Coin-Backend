const {
  getMonthlyReport: fetchMonthlyReport,
  getSixMonthsReport: fetchSixMonthsReport,
  getDailyReport: fetchDailyReport,
  getWeeklyReport: fetchWeeklyReport,
  getCategorySpendingReport: fetchCategorySpendingReport,
  getMonthlyForecast: fetchMonthlyForecast,
  generatePDFReport
} = require('../services/reportService');

/**
 * @desc    Get monthly financial report
 * @route   GET /api/reports/monthly
 * @access  Private (Student)
 */
const getMonthlyReport = async (req, res) => {
  try {
    const { month } = req.query;
    const report = await fetchMonthlyReport(req.user._id, month);

    res.status(200).json({
      success: true,
      message: 'Monthly report generated successfully',
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while generating monthly report'
    });
  }
};

/**
 * @desc    Get 6-month historical income vs expense stats
 * @route   GET /api/reports/six-months
 * @access  Private (Student)
 */
const getSixMonthsReport = async (req, res) => {
  try {
    const data = await fetchSixMonthsReport(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Six-month financial trend retrieved',
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while generating six-month report'
    });
  }
};

/**
 * @desc    Get daily spending stats
 * @route   GET /api/reports/daily
 * @access  Private (Student)
 */
const getDailyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await fetchDailyReport(req.user._id, startDate, endDate);

    res.status(200).json({
      success: true,
      message: 'Daily spending report generated',
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while generating daily report'
    });
  }
};

/**
 * @desc    Get weekly spending stats
 * @route   GET /api/reports/weekly
 * @access  Private (Student)
 */
const getWeeklyReport = async (req, res) => {
  try {
    const { weeks = 4 } = req.query;
    const data = await fetchWeeklyReport(req.user._id, weeks);

    res.status(200).json({
      success: true,
      message: 'Weekly spending report generated',
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while generating weekly report'
    });
  }
};

/**
 * @desc    Get category-wise breakdown
 * @route   GET /api/reports/category
 * @access  Private (Student)
 */
const getCategoryReport = async (req, res) => {
  try {
    const { startDate, endDate, type = 'expense' } = req.query;
    const data = await fetchCategorySpendingReport(req.user._id, startDate, endDate, type);

    res.status(200).json({
      success: true,
      message: 'Category spending report generated',
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while generating category report'
    });
  }
};

/**
 * @desc    Get rule-based monthly forecast
 * @route   GET /api/reports/forecast
 * @access  Private (Student)
 */
const getForecast = async (req, res) => {
  try {
    const data = await fetchMonthlyForecast(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Statistical spending forecast generated (Advisory only)',
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while generating forecast'
    });
  }
};

/**
 * @desc    Export monthly statement to PDF
 * @route   GET /api/reports/export
 * @access  Private (Student)
 */
const exportReport = async (req, res) => {
  try {
    const { month } = req.query;
    const reportMonth = month || new Date().toISOString().substring(0, 7);

    const pdfDoc = await generatePDFReport(req.user._id, reportMonth);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=CampusCoin_Statement_${reportMonth}.pdf`
    );

    pdfDoc.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while exporting PDF statement'
    });
  }
};

module.exports = {
  getMonthlyReport,
  getSixMonthsReport,
  getDailyReport,
  getWeeklyReport,
  getCategoryReport,
  getForecast,
  exportReport
};
