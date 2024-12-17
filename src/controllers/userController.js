const bcrypt = require('bcrypt');
const db = require('../config/db');

// User registration
exports.register = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    return res.json({ success: true, message: 'Registration successful' });
  });
};

// User login
exports.login = (req, res) => {
  const { username, password } = req.body;
  // localStorage.setItem('username', result.username);

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    if (results.length > 0 && bcrypt.compareSync(password, results[0].password)) {
      req.session.userId = results[0].id; 
      return res.json({ success: true, redirect: '/files' }); 
    } else {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  });
};