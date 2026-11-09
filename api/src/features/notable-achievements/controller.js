import pool from '../../config/db.js';

export const getAllNotableAchievements = async (req, res) => {
    try {
        const result = await pool.query('SELECT index_number, achievement FROM notable_achievements WHERE delete_flg = 0 ORDER BY index_number ASC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createNotableAchievement = async (req, res) => {
    const { achievement } = req.body;
    try {
        const maxResult = await pool.query('SELECT COALESCE(MAX(index_number), 0) as max_id FROM notable_achievements');
        const nextId = parseInt(maxResult.rows[0].max_id, 10) + 1;

        await pool.query(
            'INSERT INTO notable_achievements (index_number, achievement, delete_flg, create_date, edit_date) VALUES ($1, $2, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', 
            [nextId, achievement]
        );
        res.json({ success: true, data: { index_number: nextId, achievement } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateNotableAchievement = async (req, res) => {
    const { index_number } = req.params;
    const { achievement } = req.body;
    try {
        await pool.query(
            'UPDATE notable_achievements SET achievement = $1, edit_date = CURRENT_TIMESTAMP WHERE index_number = $2 AND delete_flg = 0', 
            [achievement, index_number]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteNotableAchievement = async (req, res) => {
    const { index_number } = req.params;
    try {
        // Soft delete
        await pool.query(
            'UPDATE notable_achievements SET delete_flg = 1, edit_date = CURRENT_TIMESTAMP WHERE index_number = $1', 
            [index_number]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
