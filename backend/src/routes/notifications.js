const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET ALL NOTIFICATIONS for logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [user_id]
    );
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK A NOTIFICATION AS READ
router.put('/:notification_id/read', authMiddleware, async (req, res) => {
  try {
    const { notification_id } = req.params;
    const user_id = req.user.user_id;

    const [result] = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [notification_id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
