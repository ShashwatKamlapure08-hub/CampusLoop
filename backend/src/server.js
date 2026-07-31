const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Basic client-server demo route (CN Module 1)
app.get('/', (req, res) => {
  res.json({ message: 'CampusLoop server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`CampusLoop backend listening on port ${PORT}`);
});
