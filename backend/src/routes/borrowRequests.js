const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// CREATE A BORROW REQUEST (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { item_id, hours_requested } = req.body;
    const borrower_id = req.user.user_id;

    if (!item_id || !hours_requested || hours_requested <= 0) {
      return res.status(400).json({ error: 'item_id and a positive hours_requested are required' });
    }

    // Fetch the item to get owner_id and price_per_hour
    const [items] = await pool.query('SELECT * FROM items WHERE item_id = ?', [item_id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];

    if (!item.availability) {
      return res.status(400).json({ error: 'Item is currently unavailable' });
    }

    if (item.owner_id === borrower_id) {
      return res.status(400).json({ error: 'You cannot borrow your own item' });
    }

    // Server-side price calculation — never trust client-sent prices
    const total_price = (item.price_per_hour * hours_requested).toFixed(2);

    const [result] = await pool.query(
      `INSERT INTO borrow_requests (item_id, borrower_id, owner_id, hours_requested, total_price, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [item_id, borrower_id, item.owner_id, hours_requested, total_price]
    );

    // Notify the owner
    await pool.query(
      `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
      [item.owner_id, `${req.user.email} requested to borrow your item (Item ID: ${item_id})`, 'BORROW_REQUEST']
    );

    res.status(201).json({
      message: 'Borrow request sent',
      request_id: result.insertId,
      total_price
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VIEW REQUESTS RECEIVED (as an owner)
router.get('/received', authMiddleware, async (req, res) => {
  try {
    const owner_id = req.user.user_id;
    const [requests] = await pool.query(
      `SELECT br.*, items.name AS item_name, users.name AS borrower_name
       FROM borrow_requests br
       JOIN items ON br.item_id = items.item_id
       JOIN users ON br.borrower_id = users.user_id
       WHERE br.owner_id = ?
       ORDER BY br.request_date DESC`,
      [owner_id]
    );
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VIEW REQUESTS SENT (as a borrower)
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const borrower_id = req.user.user_id;
    const [requests] = await pool.query(
      `SELECT br.*, items.name AS item_name, users.name AS owner_name
       FROM borrow_requests br
       JOIN items ON br.item_id = items.item_id
       JOIN users ON br.owner_id = users.user_id
       WHERE br.borrower_id = ?
       ORDER BY br.request_date DESC`,
      [borrower_id]
    );
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// APPROVE OR REJECT A REQUEST (owner only)
router.put('/:request_id/status', authMiddleware, async (req, res) => {
  try {
    const { request_id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'
    const owner_id = req.user.user_id;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const [requests] = await pool.query(
      'SELECT * FROM borrow_requests WHERE request_id = ? AND owner_id = ?',
      [request_id, owner_id]
    );
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Request not found or not yours to approve' });
    }

    await pool.query('UPDATE borrow_requests SET status = ? WHERE request_id = ?', [status, request_id]);

    // If approved, mark item as unavailable
    if (status === 'APPROVED') {
      await pool.query('UPDATE items SET availability = FALSE WHERE item_id = ?', [requests[0].item_id]);
    }
    
    // Notify the borrower
    await pool.query(
      `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
      [requests[0].borrower_id, `Your borrow request (ID: ${request_id}) was ${status.toLowerCase()}`, 'REQUEST_STATUS']
    );

    res.json({ message: `Request ${status.toLowerCase()}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK AS RETURNED (borrower or owner can confirm)
router.put('/:request_id/return', authMiddleware, async (req, res) => {
  try {
    const { request_id } = req.params;
    const user_id = req.user.user_id;

    const [requests] = await pool.query(
      'SELECT * FROM borrow_requests WHERE request_id = ?',
      [request_id]
    );
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requests[0];

    if (request.borrower_id !== user_id && request.owner_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to update this request' });
    }

    if (request.status !== 'APPROVED') {
      return res.status(400).json({ error: `Cannot return a request with status ${request.status}` });
    }

    await pool.query(
      `UPDATE borrow_requests SET status = 'RETURNED', return_date = NOW() WHERE request_id = ?`,
      [request_id]
    );

    await pool.query('UPDATE items SET availability = TRUE WHERE item_id = ?', [request.item_id]);

    // Notify the owner that the item was returned
    await pool.query(
      `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)`,
      [request.owner_id, `Your item (Request ID: ${request_id}) has been marked as returned`, 'ITEM_RETURNED']
    );

    res.json({ message: 'Item marked as returned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
