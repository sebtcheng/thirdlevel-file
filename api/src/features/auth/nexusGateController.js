import pool from '../../config/db.js';

export const checkAuthCode = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'code required' });

  try {
    const result = await pool.query(
      'SELECT role FROM authorization_codes WHERE code = $1 AND is_active = TRUE',
      [code.toUpperCase().trim()]
    );

    if (result.rows.length === 0) return res.json({ valid: false });
    
    let role = result.rows[0].role;
    if (role === 'CO_PD') role = 'Central Office';
    if (role === 'RO_HRMO') role = 'Regional Office';
    if (role === 'SDO_HRMO') role = 'School Division Office';
    if (role === 'Third Level Applicant') role = 'TLO Applicant';
    
    res.json({ valid: true, role });
  } catch (err) {
    console.error('[NexusGate] Failed to check authorization code:', err.message);
    res.status(500).json({ error: err.message });
  }
};
