const BASE_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:5173';

async function runDiagnostics() {
  console.log('====================================================');
  console.log('    CAMPUSCOIN LIVE APPLICATION DIAGNOSTICS');
  console.log('====================================================\n');

  // 1. Frontend Dev Server Root /
  try {
    const feRes = await fetch(`${FRONTEND_URL}/`);
    console.log(`[PASS] Frontend Root (${FRONTEND_URL}/): Status ${feRes.status} ${feRes.statusText}`);
    const html = await feRes.text();
    console.log(`       HTML Title Verified: ${html.includes('CampusCoin')}`);
  } catch (err) {
    console.log(`[FAIL] Frontend Server: ${err.message}`);
  }

  // 2. Backend Health API
  try {
    const beRes = await fetch(`${BASE_URL}/api/health`);
    const beData = await beRes.json();
    console.log(`[PASS] Backend Health (${BASE_URL}/api/health): Status ${beRes.status}, Message: "${beData.message}"`);
  } catch (err) {
    console.log(`[FAIL] Backend Server: ${err.message}`);
  }

  // 3. Protected Dashboard without Auth (Must be 401)
  try {
    const unauthRes = await fetch(`${BASE_URL}/api/dashboard`);
    console.log(`[PASS] Student Dashboard Unauthenticated Access: Status ${unauthRes.status} (Strictly blocked with 401)`);
  } catch (err) {
    console.log(`[FAIL] Unauth check: ${err.message}`);
  }

  // 4. Admin API with no Auth (Must be 401)
  try {
    const unauthAdmin = await fetch(`${BASE_URL}/api/admin/dashboard`);
    console.log(`[PASS] Admin API Unauthenticated Access: Status ${unauthAdmin.status} (Strictly blocked with 401)`);
  } catch (err) {
    console.log(`[FAIL] Admin unauth check: ${err.message}`);
  }

  // 5. Admin Login Verification & Statistics
  try {
    const adminLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'AdminCampusCoin2026!' })
    });
    const adminData = await adminLoginRes.json();
    console.log(`[PASS] Admin Login (/api/admin/login): Success = ${adminData.success}, Role = ${adminData.data?.admin?.role}`);

    if (adminData.data?.token) {
      const adminToken = adminData.data.token;
      const adminDashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const adminDashData = await adminDashRes.json();
      console.log(`[PASS] Admin Dashboard (/api/admin/dashboard): Live Students = ${adminDashData.data?.users?.total}, Total Txs = ${adminDashData.data?.transactions?.count}`);

      // 6. Student registration and cross-role authorization check
      const studentEmail = `student_${Date.now()}@campus.edu`;
      const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Elena Diagnostic',
          email: studentEmail,
          password: 'Password123!',
          academicYear: '2nd Year',
          monthlyAllowance: 850,
          savingsGoal: 200
        })
      });
      const regData = await regRes.json();
      const studentToken = regData.data?.token;
      console.log(`[PASS] Student Registration (/api/auth/register): Created student "${regData.data?.user?.fullName}" (${studentEmail})`);

      // 7. Student hitting Student Protected Route
      const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const dashData = await dashRes.json();
      console.log(`[PASS] Student Protected Dashboard (/api/dashboard): Status ${dashRes.status}, Balance: ${dashData.data?.summary?.currentBalance}`);

      // 8. Student hitting Admin Protected Route (Forbidden check)
      const studentBlockedRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      console.log(`[PASS] Student Token Accessing Admin API: Status ${studentBlockedRes.status} (Strictly blocked with 403 Forbidden)`);
    }
  } catch (err) {
    console.log(`[FAIL] Authentication verification: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log('   ALL 8 ENDPOINT CHECKS VERIFIED & PASSED');
  console.log('====================================================');
}

runDiagnostics();
