const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const usersRoute = require('./routes/users');
const itemsRoute = require('./routes/items');
const borrowRequestsRoute = require('./routes/borrowRequests');
const notificationsRoute = require('./routes/notifications');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/users', usersRoute);
app.use('/api/items', itemsRoute);
app.use('/api/borrow-requests', borrowRequestsRoute);
app.use('/api/notifications', notificationsRoute);

app.get('/', (req, res) => {
  res.json({ message: 'CampusLoop server is running' });
});

// Test DB connection
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SHOW TABLES;');
    res.json({ connected: true, tables: rows });
  } catch (err) {
    console.error("DATABASE TEST ERROR:", err);

    res.status(500).json({
        connected: false,
        error: err.message || String(err),
        code: err.code || null,
        errno: err.errno || null
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`CampusLoop backend listening on port ${PORT}`);
});
