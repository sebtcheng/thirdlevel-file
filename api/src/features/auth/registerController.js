import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import pool from '../../config/db.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify().then(() => console.log('SMTP connection verified')).catch(err => console.warn('SMTP verification failed:', err.message));

const sendOTPEmail = async (email, code) => {
  const mailOptions = {
    from: `"InsightEd Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verification Code - InsightEd',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #004A99;">Verify Your Email</h2>
        <p>Your verification code is:</p>
        <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 10px;">
          ${code}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">This code will expire in 10 minutes.</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

export const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query(
      `INSERT INTO verification_codes (email, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
       ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [email.toLowerCase().trim(), code]
    );

    console.log(`[Development Fallback] OTP for ${email} is: ${code}`);
    
    // Respond immediately, don't wait for email to send
    res.json({ success: true, message: 'OTP sent successfully' });
    
    sendOTPEmail(email, code).catch(emailErr => {
      console.warn('[Development] Failed to send email via SMTP, falling back to logged OTP:', emailErr.message);
    });

  } catch (err) {
    console.error('Send OTP Error:', err);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
};

// export const verifyOtp = async (req, res) => {
//   const { email, code } = req.body;
//   try {
//     const result = await pool.query(
//       'SELECT * FROM verification_codes WHERE email = $1 AND code = $2',
//       [email.toLowerCase().trim(), code]
//     );

//     if (result.rows.length === 0) {
//       return res.status(400).json({ error: 'Invalid or expired code' });
//     }

//     await pool.query('DELETE FROM verification_codes WHERE email = $1', [email.toLowerCase().trim()]);
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;

  const cleanEmail = email.toLowerCase().trim();

  console.log(cleanEmail, code);

  try {
    // Check if OTP exists and is not expired
    const result = await pool.query(
      `
      SELECT *
      FROM verification_codes
      WHERE email = $1
      AND code = $2
      AND expires_at > NOW()
      `,
      [cleanEmail, code]
    );

    console.log(result.rows);

    // Invalid or expired OTP
    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired code',
      });
    }

    // OPTIONAL:
    // Your database currently blocks DELETE
    // Uncomment this only if DELETE is allowed

    /*
    await pool.query(
      'DELETE FROM verification_codes WHERE email = $1',
      [cleanEmail]
    );
    */

    return res.json({
      success: true,
      message: 'OTP verified successfully',
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

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

export const checkEmail = async (req, res) => {
  const { email, isCO, role } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const isCOBool = isCO === 'true' || isCO === true || ADMIN_ROLES.includes(role);
    const targetRoles = isCOBool ? ADMIN_ROLES : THIRD_LEVEL_ROLES;

    const check = await pool.query(
      'SELECT uid FROM tlo_users WHERE LOWER(email) = $1 AND role = ANY($2)',
      [normalizedEmail, targetRoles]
    );
    res.json({ exists: check.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const checkMasterlistEmail = async (req, res) => {
  const { email, isCO, role } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const isCOBool = isCO === 'true' || isCO === true || ADMIN_ROLES.includes(role);
    const targetRoles = isCOBool ? ADMIN_ROLES : THIRD_LEVEL_ROLES;

    const userCheck = await pool.query(
      'SELECT uid FROM tlo_users WHERE LOWER(email) = $1 AND role = ANY($2)',
      [normalizedEmail, targetRoles]
    );
    if (userCheck.rows.length > 0) {
      return res.json({ alreadyRegistered: true });
    }

    const check = await pool.query('SELECT first_name, last_name, position_title FROM third_level_official_masterlist WHERE LOWER(email) = $1', [normalizedEmail]);
    if (check.rows.length > 0) {
      res.json({ alreadyRegistered: false, inMasterlist: true, official: check.rows[0] });
    } else {
      res.json({ alreadyRegistered: false, inMasterlist: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const registerUser = async (req, res) => {
  let { email, password, firstName, lastName, contactNumber, role, assigned_region, assigned_division, passcode, isCO } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and Password are required' });
  }

  // Defensive uppercase for names
  firstName = (firstName || '').trim().toUpperCase();
  lastName = (lastName || '').trim().toUpperCase();

  const normalizedEmail = email.toLowerCase().trim();
  const client = await pool.connect();

  try {
    let assignedRole = role || 'TLO Applicant';
    if (assignedRole === 'Third Level Applicant') assignedRole = 'TLO Applicant';
    if (assignedRole === 'CO_PD') assignedRole = 'Central Office';
    if (assignedRole === 'RO_HRMO') assignedRole = 'Regional Office';
    if (assignedRole === 'SDO_HRMO') assignedRole = 'School Division Office';

    if (['Personnel Admin', 'Central Office'].includes(assignedRole) && !normalizedEmail.endsWith('@deped.gov.ph')) {
      client.release();
      return res.status(400).json({ error: 'Central Office Admin accounts must use an official @deped.gov.ph email' });
    }

    await client.query('BEGIN');

    const isAdminRole = isCO === true || isCO === 'true' || ADMIN_ROLES.includes(assignedRole);
    const targetRoles = isAdminRole ? ADMIN_ROLES : THIRD_LEVEL_ROLES;

    const userCheck = await client.query(
      'SELECT uid FROM tlo_users WHERE LOWER(email) = $1 AND role = ANY($2)',
      [normalizedEmail, targetRoles]
    );
    if (userCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'This email is already registered in InsightEd for this portal. Please Login instead.' });
    }

    let userRegistrationStatus = 'Approved';
    if (assignedRole === 'TLO Applicant') {
      const mlCheck = await client.query('SELECT "TLOid" FROM third_level_official_masterlist WHERE LOWER(email) = $1', [normalizedEmail]);
      if (mlCheck.rows.length === 0) {
        userRegistrationStatus = 'For Approval';
        const mlUidRes = await client.query(`
          SELECT COALESCE(MAX(CAST(SUBSTRING("TLOid" FROM 5) AS INTEGER)), 0) AS max_num
          FROM third_level_official_masterlist WHERE "TLOid" ~ '^TLO-[0-9]{4}$'
        `);
        const nextNum = parseInt(mlUidRes.rows[0].max_num) + 1;
        const newTloId = `TLO-${String(nextNum).padStart(4, '0')}`;

        await client.query(`
          INSERT INTO third_level_official_masterlist (
              "TLOid", first_name, last_name, email, position_title, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, '', 'For Approval', NOW(), NOW())
        `, [newTloId, firstName, lastName, normalizedEmail]);
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uidRes = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(uid FROM 10) AS INTEGER)), 0) AS max_num
      FROM tlo_users WHERE uid ~ '^TLO-2026-[0-9]{4}$'
    `);
    const nextNum = parseInt(uidRes.rows[0].max_num) + 1;
    const uid = `TLO-2026-${String(nextNum).padStart(4, '0')}`;

    await client.query(
      `INSERT INTO tlo_users (
        uid, email, password_hash, hash_version, first_name, last_name, contact_number, role, assigned_region, assigned_division, registration_status, created_at, passcode
      ) VALUES ($1, $2, $3, 'bcrypt', $4, $5, $6, $7, $8, $9, $11, NOW(), $10)`,
      [uid, normalizedEmail, passwordHash, firstName, lastName, contactNumber, assignedRole, assigned_region, assigned_division, passcode || null, userRegistrationStatus]
    );

    const adminRoles = ['Personnel Admin', 'Admin', 'Super User', 'Central Office', 'Regional Office', 'School Division Office'];
    if (!adminRoles.includes(assignedRole)) {
      await client.query(
        `INSERT INTO third_level_officials_profiling_application (
          application_id, app_TLOid, first_name, last_name, email, contact_details, application_status, created_at, updated_at
        ) VALUES (DEFAULT, $1, $2, $3, $4, $5, NULL, NOW(), NOW())`,
        [uid, firstName, lastName, normalizedEmail, contactNumber]
      );
    }

    await client.query('COMMIT');

    const secret = process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD';
    const token = jwt.sign(
      { uid, email: normalizedEmail, role: assignedRole, assigned_region, assigned_division },
      secret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: { uid, email: normalizedEmail, role: assignedRole, first_name: firstName, last_name: lastName, assigned_region, assigned_division }
    });

    // Send email notification to officials if registration is pending
    if (userRegistrationStatus === 'For Approval') {
      const tloEmail = process.env.TLO_EMAIL;
      if (tloEmail) {
        transporter.sendMail({
          from: `"InsightEd System" <${process.env.EMAIL_USER}>`,
          to: tloEmail,
          subject: 'New Official Registration Pending Approval',
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #08315F;">New Registration Pending Approval</h2>
              <p>A new official has registered and requires Central Office approval:</p>
              <ul>
                <li><strong>Name:</strong> ${firstName} ${lastName}</li>
                <li><strong>Email:</strong> ${normalizedEmail}</li>
              </ul>
              <p>Please log in to the dashboard to review this request.</p>
            </div>
          `
        }).catch(err => console.error('[Register] Failed to send notification email:', err.message));
      }
    }
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('[Register] Registration failed:', err.message);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  } finally {
    if (client) client.release();
  }
};
