const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:5000';

// Helper for assertions
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName} - ${details}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('  CAMPUS COIN BACKEND - COMPREHENSIVE TEST SUITE');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // 1. HEALTH CHECKS
    // ----------------------------------------------------
    console.log('--- 1. Health Checks ---');
    const rootRes = await fetch(`${BASE_URL}/`);
    const rootData = await rootRes.json();
    assert(rootRes.status === 200 && rootData.success === true, 'GET / returns success message');

    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.success === true, 'GET /api/health returns healthy status');

    // ----------------------------------------------------
    // 2. STUDENT AUTHENTICATION & PROFILE
    // ----------------------------------------------------
    console.log('\n--- 2. Student Authentication & Registration ---');
    const testEmail = `student_${Date.now()}@campus.edu`;
    const testPassword = 'Password123!';

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Alex Student',
        email: testEmail,
        password: testPassword,
        academicYear: '2nd Year',
        monthlyAllowance: 500,
        savingsGoal: 100
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.data.token, 'Student Registration succeeds with token');

    let studentToken = regData.data?.token;
    const studentId = regData.data?.user?._id;

    // Test duplicate registration rejection
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Duplicate Alex',
        email: testEmail,
        password: 'anotherPassword!'
      })
    });
    assert(dupRes.status === 400, 'Duplicate registration rejected with 400');

    // Test invalid login (wrong password)
    const wrongLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' })
    });
    assert(wrongLoginRes.status === 401, 'Login with wrong password fails with 401');

    // Test valid login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.data.token, 'Student Login succeeds');
    studentToken = loginData.data.token;

    // Test GET /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.data.email === testEmail, 'GET /api/auth/me returns current user');

    // ----------------------------------------------------
    // 3. PROFILE MANAGEMENT
    // ----------------------------------------------------
    console.log('\n--- 3. Profile Management ---');
    const updateProfRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        fullName: 'Alex Vance',
        academicYear: '3rd Year',
        monthlyAllowance: 650,
        savingsGoal: 150
      })
    });
    const updateProfData = await updateProfRes.json();
    assert(
      updateProfRes.status === 200 && updateProfData.data.fullName === 'Alex Vance',
      'PUT /api/users/profile updates student info'
    );

    // ----------------------------------------------------
    // 4. PASSWORD RESET FLOW
    // ----------------------------------------------------
    console.log('\n--- 4. Password Recovery Flow ---');
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const forgotData = await forgotRes.json();
    assert(forgotRes.status === 200 && forgotData.data.resetToken, 'POST /api/auth/forgot-password generates token');

    const resetToken = forgotData.data?.resetToken;
    const newPassword = 'NewSecretPassword2026!';

    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password/${resetToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });
    assert(resetRes.status === 200, 'POST /api/auth/reset-password/:token resets password');

    // Verify login with new password
    const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: newPassword })
    });
    const newLoginData = await newLoginRes.json();
    assert(newLoginRes.status === 200, 'Login with new password succeeds');
    studentToken = newLoginData.data.token;

    // ----------------------------------------------------
    // 5. CATEGORY MANAGEMENT
    // ----------------------------------------------------
    console.log('\n--- 5. Category Management ---');
    const catListRes = await fetch(`${BASE_URL}/api/categories`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const catListData = await catListRes.json();
    assert(
      catListRes.status === 200 && catListData.data.length >= 12,
      'GET /api/categories returns default categories'
    );

    const foodCategory = catListData.data.find((c) => c.name === 'Food' && c.type === 'expense');
    const allowanceCategory = catListData.data.find((c) => c.name === 'Allowance' && c.type === 'income');

    // Create custom personal category
    const createCatRes = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        name: 'Photography Club',
        type: 'expense',
        icon: 'camera',
        color: '#f43f5e'
      })
    });
    const createCatData = await createCatRes.json();
    assert(createCatRes.status === 201, 'POST /api/categories creates personal category');
    const customCatId = createCatData.data._id;

    // Attempt to delete default category (should be blocked with 403)
    const delDefCatRes = await fetch(`${BASE_URL}/api/categories/${foodCategory._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(delDefCatRes.status === 403, 'Deleting default system category is forbidden for students (403)');

    // ----------------------------------------------------
    // 6. ADVISORY CATEGORY SUGGESTION & TRANSACTIONS
    // ----------------------------------------------------
    console.log('\n--- 6. Category Suggestion & Transactions ---');
    const suggestRes = await fetch(`${BASE_URL}/api/transactions/suggest-category`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        description: 'Bought burger and fries from campus cafeteria',
        type: 'expense'
      })
    });
    const suggestData = await suggestRes.json();
    assert(
      suggestRes.status === 200 && suggestData.data.suggestedCategoryName === 'Food',
      'Category suggestion correctly identifies "Food" from description'
    );

    // Create Income Transaction
    const incTxRes = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        category: allowanceCategory._id,
        amount: 500,
        type: 'income',
        description: 'Monthly student allowance from parents',
        date: new Date().toISOString()
      })
    });
    const incTxData = await incTxRes.json();
    assert(incTxRes.status === 201 && incTxData.data.amount === 500, 'POST /api/transactions creates income');

    // Create Expense Transaction
    const expTxRes = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        category: foodCategory._id,
        amount: 25,
        type: 'expense',
        description: 'Campus cafeteria meal',
        date: new Date().toISOString()
      })
    });
    const expTxData = await expTxRes.json();
    assert(expTxRes.status === 201 && expTxData.data.amount === 25, 'POST /api/transactions creates expense');
    const createdExpenseId = expTxData.data._id;

    // Test duplicate transaction detection warning
    const dupTxRes = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        category: foodCategory._id,
        amount: 25,
        type: 'expense',
        description: 'Campus cafeteria meal',
        date: new Date().toISOString()
      })
    });
    const dupTxData = await dupTxRes.json();
    assert(
      dupTxRes.status === 201 && dupTxData.warnings && dupTxData.warnings.length > 0,
      'Duplicate transaction detection generates advisory warning'
    );

    // Test unusually large transaction detection warning (expense of $1500)
    const largeTxRes = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        category: foodCategory._id,
        amount: 1500,
        type: 'expense',
        description: 'Semester catering package',
        date: new Date().toISOString()
      })
    });
    const largeTxData = await largeTxRes.json();
    assert(
      largeTxRes.status === 201 && largeTxData.warnings && largeTxData.warnings.length > 0,
      'Unusually large transaction generates advisory warning'
    );

    // Get transactions list
    const getTxRes = await fetch(`${BASE_URL}/api/transactions?type=expense`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const getTxData = await getTxRes.json();
    assert(getTxRes.status === 200 && getTxData.data.transactions.length >= 1, 'GET /api/transactions returns items');

    // Get transaction summary
    const summaryRes = await fetch(`${BASE_URL}/api/transactions/summary`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const summaryData = await summaryRes.json();
    assert(summaryRes.status === 200 && summaryData.data.totalIncome > 0, 'GET /api/transactions/summary calculates totals');

    // ----------------------------------------------------
    // 7. BUDGET SYSTEM & ALERTS
    // ----------------------------------------------------
    console.log('\n--- 7. Budget System & Threshold Alerts ---');
    const currentMonth = new Date().toISOString().substring(0, 7);

    const budgetRes = await fetch(`${BASE_URL}/api/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        category: foodCategory._id,
        month: currentMonth,
        limitAmount: 100 // $100 limit, spending is already >= $25
      })
    });
    const budgetData = await budgetRes.json();
    assert(budgetRes.status === 201, 'POST /api/budgets creates category budget');

    // Check budget status
    const statusRes = await fetch(`${BASE_URL}/api/budgets/status`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const statusData = await statusRes.json();
    assert(
      statusRes.status === 200 && statusData.data.budgets.length >= 1,
      'GET /api/budgets/status computes consumption percentages'
    );

    // ----------------------------------------------------
    // 8. DASHBOARD API
    // ----------------------------------------------------
    console.log('\n--- 8. Complete Dashboard API ---');
    const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const dashData = await dashRes.json();
    assert(
      dashRes.status === 200 &&
      dashData.data.summary &&
      Array.isArray(dashData.data.recentTransactions) &&
      Array.isArray(dashData.data.spendingTrend),
      'GET /api/dashboard returns comprehensive dashboard payload'
    );

    // ----------------------------------------------------
    // 9. SAVING TIPS ENGINE
    // ----------------------------------------------------
    console.log('\n--- 9. Saving Tips Engine ---');
    const tipsRes = await fetch(`${BASE_URL}/api/tips`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const tipsData = await tipsRes.json();
    assert(tipsRes.status === 200 && tipsData.data.length >= 1, 'GET /api/tips generates & returns personalized tips');

    if (tipsData.data.length > 0) {
      const tipId = tipsData.data[0]._id;
      // Pin tip
      const pinRes = await fetch(`${BASE_URL}/api/tips/${tipId}/pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert(pinRes.status === 200, 'POST /api/tips/:id/pin toggles pin status');

      // Dismiss tip
      const dismissRes = await fetch(`${BASE_URL}/api/tips/${tipId}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert(dismissRes.status === 200, 'POST /api/tips/:id/dismiss dismisses tip');
    }

    // ----------------------------------------------------
    // 10. MONTHLY INSIGHTS
    // ----------------------------------------------------
    console.log('\n--- 10. Monthly Narrative Insights ---');
    const insightRes = await fetch(`${BASE_URL}/api/insights/current`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const insightData = await insightRes.json();
    assert(
      insightRes.status === 200 && insightData.data.narrativeText.length > 10,
      'GET /api/insights/current returns plain-language summary with disclaimer'
    );

    // ----------------------------------------------------
    // 11. NOTIFICATIONS
    // ----------------------------------------------------
    console.log('\n--- 11. In-App Notifications ---');
    const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const notifData = await notifRes.json();
    assert(notifRes.status === 200 && Array.isArray(notifData.data.notifications), 'GET /api/notifications returns list');

    const readAllRes = await fetch(`${BASE_URL}/api/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(readAllRes.status === 200, 'PUT /api/notifications/read-all marks all read');

    // ----------------------------------------------------
    // 12. REPORTS & PDF EXPORT
    // ----------------------------------------------------
    console.log('\n--- 12. Reports & PDF Export ---');
    const mReportRes = await fetch(`${BASE_URL}/api/reports/monthly`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const mReportData = await mReportRes.json();
    assert(mReportRes.status === 200 && mReportData.data.month, 'GET /api/reports/monthly returns report');

    const sixMonthsRes = await fetch(`${BASE_URL}/api/reports/six-months`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const sixMonthsData = await sixMonthsRes.json();
    assert(sixMonthsRes.status === 200 && sixMonthsData.data.length === 6, 'GET /api/reports/six-months returns 6 months');

    const forecastRes = await fetch(`${BASE_URL}/api/reports/forecast`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const forecastData = await forecastRes.json();
    assert(forecastRes.status === 200 && forecastData.data.expectedExpense !== undefined, 'GET /api/reports/forecast returns forecast');

    // PDF Export
    const pdfRes = await fetch(`${BASE_URL}/api/reports/export`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const pdfContentType = pdfRes.headers.get('content-type');
    assert(
      pdfRes.status === 200 && pdfContentType && pdfContentType.includes('application/pdf'),
      'GET /api/reports/export generates valid PDF binary stream'
    );

    // ----------------------------------------------------
    // 13. CSV IMPORT
    // ----------------------------------------------------
    console.log('\n--- 13. CSV Import ---');
    // Create temporary test CSV file
    const sampleCSVContent = `amount,type,category,description,date\n15.50,expense,Food,Campus Coffee & Muffin,2026-09-20\n30.00,expense,Transport,Metro Card Recharge,2026-09-21\n120.00,income,Part-time Job,Lab assistant payment,2026-09-22\n`;
    const tempCSVPath = path.join(__dirname, 'temp_test_import.csv');
    fs.writeFileSync(tempCSVPath, sampleCSVContent);

    // Build multipart/form-data upload using standard Blob / FormData
    const fileBlob = new Blob([fs.readFileSync(tempCSVPath)], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', fileBlob, 'sample.csv');

    const importRes = await fetch(`${BASE_URL}/api/import/transactions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`
      },
      body: formData
    });
    const importData = await importRes.json();
    assert(
      importRes.status === 200 && importData.data.importedCount === 3,
      `POST /api/import/transactions imported ${importData.data?.importedCount} records successfully`
    );

    // Clean up temporary local test file
    try { fs.unlinkSync(tempCSVPath); } catch (e) {}

    // ----------------------------------------------------
    // 14. ADMIN PANEL & SECURITY
    // ----------------------------------------------------
    console.log('\n--- 14. Admin Panel & Access Security ---');

    // Student attempting to access admin route (Forbidden 403 test)
    const studentAsAdminRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentAsAdminRes.status === 403, 'Student token accessing /api/admin/dashboard is blocked with 403 Forbidden');

    // Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'AdminCampusCoin2026!'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLoginData.data.token, 'Admin Login succeeds');

    const adminToken = adminLoginData.data?.token;

    // Admin Dashboard
    const adminDashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminDashData = await adminDashRes.json();
    assert(
      adminDashRes.status === 200 && adminDashData.data.users.total >= 1,
      'GET /api/admin/dashboard returns platform metrics'
    );

    // Admin Users list
    const adminUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminUsersData = await adminUsersRes.json();
    assert(adminUsersRes.status === 200 && adminUsersData.data.users.length >= 1, 'GET /api/admin/users returns student list');

    // Admin Statistics
    const adminStatsRes = await fetch(`${BASE_URL}/api/admin/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminStatsData = await adminStatsRes.json();
    assert(adminStatsRes.status === 200 && adminStatsData.data.totalExpenseVolume >= 0, 'GET /api/admin/statistics returns stats');

    // Admin Announcements
    const createAnnounceRes = await fetch(`${BASE_URL}/api/admin/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Mid-term Financial Literacy Week',
        content: 'Join free campus budgeting seminars this Wednesday at the student union.',
        type: 'announcement'
      })
    });
    const createAnnounceData = await createAnnounceRes.json();
    assert(createAnnounceRes.status === 201, 'POST /api/admin/announcements publishes announcement to students');

    // ----------------------------------------------------
    // 15. CROSS-USER AUTHORIZATION ISOLATION
    // ----------------------------------------------------
    console.log('\n--- 15. Cross-User Data Isolation ---');
    // Create Student 2
    const s2Email = `student2_${Date.now()}@campus.edu`;
    const s2Reg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Jordan Student',
        email: s2Email,
        password: 'Password123!'
      })
    });
    const s2Data = await s2Reg.json();
    const s2Token = s2Data.data.token;

    // Student 2 tries to access Student 1's transaction
    const unauthorizedTxRes = await fetch(`${BASE_URL}/api/transactions/${createdExpenseId}`, {
      headers: { Authorization: `Bearer ${s2Token}` }
    });
    assert(
      unauthorizedTxRes.status === 404,
      'Student 2 cannot view Student 1 transaction (returns 404 Not Found)'
    );

    // Student 2 tries to delete Student 1's transaction
    const unauthorizedDelRes = await fetch(`${BASE_URL}/api/transactions/${createdExpenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${s2Token}` }
    });
    assert(
      unauthorizedDelRes.status === 404,
      'Student 2 cannot delete Student 1 transaction (returns 404 Not Found)'
    );

    console.log('\n====================================================');
    console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  }
}

runTests();
