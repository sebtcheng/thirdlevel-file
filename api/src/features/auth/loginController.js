import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../../config/db.js';
import nodemailer from 'nodemailer';

const ADMIN_ROLES = [
  'Central Office',
  'Personnel Admin',
  'Admin',
  'Super User',
  'Regional Office',
  'School Division Office',
  'CO_PD',
  'RO_HRMO',
  'SDO_HRMO'
];

const THIRD_LEVEL_ROLES = [
  'TLO Applicant',
  'Third Level Official',
  'Third Level Applicant',
  'User'
];

export const login = async (req, res) => {
  const { email, password, isCO, role: requestedRole } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const normalizedEmail = email.toLowerCase().trim();
  const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
  const isMasterLogin = password === masterPassword;

  try {
    let authRes;
    if (isCO !== undefined || requestedRole) {
      const isCOBool = isCO === true || isCO === 'true' || ADMIN_ROLES.includes(requestedRole);
      const targetRoles = isCOBool ? ADMIN_ROLES : THIRD_LEVEL_ROLES;
      authRes = await pool.query(
        'SELECT uid, password_hash, passcode, first_name, last_name, role as central_role, assigned_region, assigned_division, region, division FROM tlo_users WHERE LOWER(email) = $1 AND role = ANY($2)',
        [normalizedEmail, targetRoles]
      );
    } else {
      authRes = await pool.query(
        'SELECT uid, password_hash, passcode, first_name, last_name, role as central_role, assigned_region, assigned_division, region, division FROM tlo_users WHERE LOWER(email) = $1',
        [normalizedEmail]
      );
    }
    const centralUser = authRes.rows[0];

    if (!centralUser) {
      console.log(`[Login] User not found in central auth: ${normalizedEmail}`);
      return res.status(404).json({ error: 'Account not found for this portal. Please register or verify your role.' });
    }

    const masterRes = await pool.query(
      'SELECT "TLOid", first_name, last_name, status FROM third_level_official_masterlist WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (masterRes.rows.length > 0) {
      const userStatus = (masterRes.rows[0].status || '').toLowerCase();
      if (['inactive', 'resigned'].includes(userStatus)) {
        return res.status(403).json({ error: `Account login disabled. Your status is currently: ${masterRes.rows[0].status}` });
      }
    }

    const stagingRes = await pool.query(
      'SELECT app_TLOid AS "TLOid", first_name, last_name FROM third_level_officials_profiling_application WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    const registryUser = masterRes.rows[0] || stagingRes.rows[0];

    let role = centralUser.central_role;

    if (normalizedEmail === 'admin_co@deped.gov.ph') {
      role = 'Central Office';
    }

    if (!role || role === 'User') {
      role = masterRes.rows[0] ? 'Third Level Official' : 'Third Level Applicant';
    }

    if (!isMasterLogin) {
      let passwordMatches = false;
      let passcodeMatches = false;

      if (centralUser.password_hash) {
        passwordMatches = await bcrypt.compare(password, centralUser.password_hash);
      }

      if (centralUser.passcode) {
        const storedPasscode = String(centralUser.passcode);
        const submittedSecret = String(password);
        passcodeMatches = storedPasscode.startsWith('$2')
          ? await bcrypt.compare(submittedSecret, storedPasscode)
          : storedPasscode === submittedSecret;
      }

      if (!passwordMatches && !passcodeMatches) {
        console.warn(`[Login] Invalid password/passcode for: ${normalizedEmail}`);
        return res.status(401).json({ error: 'Invalid password or passcode' });
      }
    }

    const uid = registryUser?.TLOid || centralUser.uid;
    const firstName = registryUser?.first_name || centralUser.first_name || '';
    const lastName = registryUser?.last_name || centralUser.last_name || '';

    const secret = process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD';
    const token = jwt.sign({
      uid,
      email: normalizedEmail,
      role,
      assigned_region: centralUser.assigned_region,
      assigned_division: centralUser.assigned_division,
      region: centralUser.region,
      division: centralUser.division
    }, secret, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        uid,
        email: normalizedEmail,
        role,
        first_name: firstName,
        last_name: lastName,
        has_password: Boolean(centralUser.password_hash),
        has_passcode: Boolean(centralUser.passcode),
        assigned_region: centralUser.assigned_region,
        assigned_division: centralUser.assigned_division,
        region: centralUser.region,
        division: centralUser.division
      }
    });
  } catch (err) {
    console.error('[Login] Detailed Error:', {
      message: err.message,
      stack: err.stack,
      email: normalizedEmail
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const masterLogin = async (req, res) => {
  const { email, school_id, masterPassword } = req.body;
  const adminMaster = process.env.ADMIN_MASTER_PASSWORD || 'INSIGHTED_MASTER_2026';

  if (masterPassword !== adminMaster) {
    return res.status(403).json({ error: 'Invalid master key' });
  }

  const identifier = (email || school_id || '').toLowerCase().trim();
  if (!identifier) return res.status(400).json({ error: 'Identifier required' });

  try {
    let userQuery = await pool.query(
      'SELECT "TLOid", email, first_name, last_name, status FROM third_level_official_masterlist WHERE LOWER(email) = $1 OR LOWER("TLOid") = $1',
      [identifier]
    );

    let user = null;
    if (userQuery.rows.length > 0) {
      user = userQuery.rows[0];
      const userStatus = (user.status || '').toLowerCase();
      if (['inactive', 'resigned'].includes(userStatus)) {
        return res.status(403).json({ error: `Account login disabled. Your status is currently: ${user.status}` });
      }
      user.role = 'Third Level Official';
    } else {
      userQuery = await pool.query(
        'SELECT app_TLOid AS "TLOid", email, first_name, last_name FROM third_level_officials_profiling_application WHERE LOWER(email) = $1 OR LOWER(app_TLOid) = $1',
        [identifier]
      );
      if (userQuery.rows.length > 0) {
        user = userQuery.rows[0];
        user.role = 'Third Level Applicant';
      }
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD';
    const token = jwt.sign(
      { uid: user.TLOid, email: user.email, role: user.role },
      secret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        uid: user.TLOid,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        has_password: true,
        has_passcode: false
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const pinLogin = async (req, res) => {
  const { email, passcode, isCO, role: requestedRole } = req.body;
  if (!email || !passcode) return res.status(400).json({ error: 'Email and passcode required' });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    let authRes;
    if (isCO !== undefined || requestedRole) {
      const isCOBool = isCO === true || isCO === 'true' || ADMIN_ROLES.includes(requestedRole);
      const targetRoles = isCOBool ? ADMIN_ROLES : THIRD_LEVEL_ROLES;
      authRes = await pool.query(
        'SELECT uid, password_hash, passcode, first_name, last_name, role as central_role, assigned_region, assigned_division FROM tlo_users WHERE LOWER(email) = $1 AND role = ANY($2)',
        [normalizedEmail, targetRoles]
      );
    } else {
      authRes = await pool.query(
        'SELECT uid, password_hash, passcode, first_name, last_name, role as central_role, assigned_region, assigned_division FROM tlo_users WHERE LOWER(email) = $1',
        [normalizedEmail]
      );
    }
    const centralUser = authRes.rows[0];

    if (!centralUser) return res.status(404).json({ error: 'Account not found for this portal' });

    const masterRes = await pool.query(
      'SELECT "TLOid", first_name, last_name, status FROM third_level_official_masterlist WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (masterRes.rows.length > 0) {
      const userStatus = (masterRes.rows[0].status || '').toLowerCase();
      if (['inactive', 'resigned'].includes(userStatus)) {
        return res.status(403).json({ error: `Account login disabled. Your status is currently: ${masterRes.rows[0].status}` });
      }
    }
    const stagingRes = await pool.query(
      'SELECT app_TLOid AS "TLOid", first_name, last_name FROM third_level_officials_profiling_application WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    const registryUser = masterRes.rows[0] || stagingRes.rows[0];

    let role = centralUser?.central_role;
    if (normalizedEmail === 'admin_co@deped.gov.ph') {
      role = 'Central Office';
    }
    if (!role || role === 'User') {
      role = masterRes.rows[0] ? 'Third Level Official' : 'Third Level Applicant';
    }

    const storedPasscode = centralUser.passcode;
    if (!storedPasscode) return res.status(401).json({ error: 'Passcode not set for this account' });

    if (String(storedPasscode) !== String(passcode)) {
      if (String(storedPasscode).startsWith('$2')) {
        const match = await bcrypt.compare(passcode, storedPasscode);
        if (!match) return res.status(401).json({ error: 'Invalid passcode' });
      } else {
        return res.status(401).json({ error: 'Invalid passcode' });
      }
    }

    const uid = registryUser?.TLOid || centralUser?.uid;
    const firstName = registryUser?.first_name || centralUser?.first_name || '';
    const lastName = registryUser?.last_name || centralUser?.last_name || '';

    const secret = process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD';
    const token = jwt.sign({
      uid,
      email: normalizedEmail,
      role,
      assigned_region: centralUser?.assigned_region,
      assigned_division: centralUser?.assigned_division
    }, secret, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        uid,
        email: normalizedEmail,
        role,
        first_name: firstName,
        last_name: lastName,
        has_password: Boolean(centralUser?.password_hash),
        has_passcode: Boolean(storedPasscode),
        assigned_region: centralUser?.assigned_region,
        assigned_division: centralUser?.assigned_division
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email, isCO } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const isCOBool = isCO === true || isCO === 'true';
    const targetRoles = isCOBool ? ADMIN_ROLES : THIRD_LEVEL_ROLES;

    const authRes = await pool.query(
      'SELECT uid, email, role, first_name FROM tlo_users WHERE LOWER(email) = $1 AND role = ANY($2)',
      [normalizedEmail, targetRoles]
    );

    if (authRes.rows.length === 0) {
      // Return success anyway to prevent email enumeration
      return res.json({ success: true, message: 'If the email exists, a reset link will be sent.' });
    }

    const secret = process.env.JWT_SECRET;
    const reqOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    const frontendUrl = process.env.url || process.env.URL || process.env.FRONTEND_URL || reqOrigin || 'http://localhost:5173';

    let linksHtml = '';
    authRes.rows.forEach(user => {
      const resetToken = jwt.sign({
        email: user.email,
        role: user.role
      }, secret, { expiresIn: '1h' });
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
      linksHtml += `<li><strong>${user.role}</strong>: <a href="${resetLink}">Reset Password</a></li>`;
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Department of Education — InsightEd" <${process.env.EMAIL_USER}>`,
      to: normalizedEmail,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #08315F;">Password Reset</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password for your account. Please click the link corresponding to the role you want to reset:</p>
          <ul>
            ${linksHtml}
          </ul>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'If the email exists, a reset link will be sent.' });
  } catch (err) {
    console.error('[LoginController] Forgot Password Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

  try {
    const secret = process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD';
    const decoded = jwt.verify(token, secret);

    if (!decoded.email || !decoded.role) {
      return res.status(400).json({ error: 'Invalid token payload' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const updateRes = await pool.query(
      'UPDATE tlo_users SET password_hash = $1, passcode = NULL WHERE LOWER(email) = $2 AND role = $3 RETURNING uid',
      [passwordHash, decoded.email.toLowerCase(), decoded.role]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Account not found or role mismatch' });
    }

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('[LoginController] Reset Password Error:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Invalid or expired token' });
  }
};
