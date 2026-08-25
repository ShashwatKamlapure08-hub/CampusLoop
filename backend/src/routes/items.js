const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// LIST AN ITEM (protected — must be logged in)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, category, image_url, price_per_hour } = req.body;
    const owner_id = req.user.user_id;

    if (!name || price_per_hour === undefined) {
      return res.status(400).json({ error: 'Name and price_per_hour are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO items (owner_id, name, description, category, image_url, price_per_hour)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [owner_id, name, description || null, category || null, image_url || null, price_per_hour]
    );

    res.status(201).json({ message: 'Item listed', item_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MY LISTED ITEMS (protected — regardless of availability)
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const owner_id = req.user.user_id;
    const [items] = await pool.query(
      `SELECT * FROM items WHERE owner_id = ? ORDER BY created_at DESC`,
      [owner_id]
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BROWSE ALL AVAILABLE ITEMS (public)
router.get('/', async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT items.*, users.name AS owner_name 
       FROM items 
       JOIN users ON items.owner_id = users.user_id 
       WHERE availability = TRUE`
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
