const router = require('express').Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const checkAuth = require('../middleware/auth');

router
  .route('/cart')
  .post(checkAuth, async (req, res) => {
  
  })
  .delete(checkAuth, async (req, res) => {
  
  });

router.post('/user', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await db.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    res.redirect('/login');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).send('User already exists.');
    }
    res.status(500).send('An error occurred.');
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }
  const [[user]] = await db.query('SELECT * FROM users WHERE username=?', [username]);
  if (!user) {
    return res.status(400).send('User not found.');
  }
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(400).send('Incorrect password.');
  }
  req.session.loggedIn = true;
  req.session.userId = user.id;
  req.session.save(() => {
    res.redirect('/');
  });
});

router.get('/logout', async (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
