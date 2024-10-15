
router.post('/user', async (req, res) => {
  const { username, password } = req.body;
  
 
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }
  
 
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
   
    await db.query(
      `INSERT INTO users (username, password) VALUES (?, ?)`,
      [username, hashedPassword]
    );
    res.redirect('/login');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).send('User already exists');
    }
    res.status(500).send('Server error');
  }
});


router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }
  
 
  const [[user]] = await db.query(`SELECT * FROM users WHERE username=?`, [username]);

  
  if (!user) {
    return res.status(400).send('Invalid username or password');
  }
  
  
  const isMatch = await bcrypt.compare(password, user.password);
  
 
  if (!isMatch) {
    return res.status(400).send('Invalid username or password');
  }

 
  req.session.loggedIn = true;
  req.session.userId = user.id;

 
  req.session.save(err => {
    if (err) {
      return res.status(500).send('Server error');
    }
    res.redirect('/');
  });
});

router.get('/logout', (req, res) => {
  
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Server error');
    }
    res.redirect('/');
  });
});
