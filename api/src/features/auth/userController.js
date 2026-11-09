import bcrypt from 'bcrypt';
import pool from '../../config/db.js';

export const updateSettings = async (req, res) => {
  const { email } = req.user;
  const { firstName, lastName, password, passcode } = req.body;

  if (!email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updates = [];
    const values = [];
    let queryIndex = 1;

    if (firstName !== undefined && firstName !== '') {
      updates.push(`first_name = $${queryIndex++}`);
      values.push(firstName);
    }
    
    if (lastName !== undefined && lastName !== '') {
      updates.push(`last_name = $${queryIndex++}`);
      values.push(lastName);
    }

    if (password !== undefined && password !== '') {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${queryIndex++}`);
      values.push(passwordHash);
    }

    if (passcode !== undefined && passcode !== '') {
      // Store passcode exactly as it was done in registerController
      // registerController stores it plainly or processes it. 
      // Assuming registerController stores passcode securely or not depending on env, wait, in registerController it says:
      // "const passcodeMatch = String(centralUser.passcode);"
      // Let's check how register handles passcode. Usually it's stored plainly if it's just a 6-digit pin or hashed.
      // Wait, let's just hash it if needed or store plain if that's what the system does.
      // In loginController it says: 
      // `passcodeMatches = storedPasscode.startsWith('$2') ? await bcrypt.compare(submittedSecret, storedPasscode) : storedPasscode === submittedSecret;`
      // It supports both. We'll hash it for security.
      const passcodeHash = await bcrypt.hash(passcode, 10);
      updates.push(`passcode = $${queryIndex++}`);
      values.push(passcodeHash);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(email.toLowerCase().trim());
    
    const updateQuery = `
      UPDATE tlo_users 
      SET ${updates.join(', ')} 
      WHERE LOWER(email) = $${queryIndex}
      RETURNING uid, first_name, last_name, email, role;
    `;

    const result = await client.query(updateQuery, values);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Settings updated successfully', user: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Update Settings Error]', err);
    res.status(500).json({ error: 'Internal server error while updating settings' });
  } finally {
    client.release();
  }
};
