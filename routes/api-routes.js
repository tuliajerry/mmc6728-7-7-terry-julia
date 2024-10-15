const router = require('express').Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const checkAuth = require('../middleware/auth');

router
  .route('/cart')
  .post(checkAuth, async (req, res) => {
    const { quantity } = req.body;
    const { inventoryId } = req.query;
    const [[item]] = await db.query(`SELECT * FROM inventory WHERE id=?`, [inventoryId]);
    if (!item) return res.status(404).send('Item not found');
    if (quantity > item.quantity) return res.status(409).send('Not enough inventory');

    const [[cartItem]] = await db.query(
      `SELECT
        inventory.id,
        name,
        price,
        inventory.quantity AS inventoryQuantity,
        cart.id AS cartId,
        cart.user_id
      FROM inventory
      LEFT JOIN cart on cart.inventory_id=inventory.id
      WHERE inventory.id=? AND cart.user_id=?;`,
      [inventoryId, req.session.userId]
    );
    if (cartItem) {
      await db.query(
        `UPDATE cart SET quantity=quantity+? WHERE inventory_id=? AND user_id=?`,
        [quantity, inventoryId, req.session.userId]
      );
    } else {
      await db.query(
        `INSERT INTO cart(inventory_id, quantity, user_id) VALUES (?,?,?)`,
        [inventoryId, quantity, req.session.userId]
      );
    }
    res.redirect('/cart');
  })
  .delete(checkAuth, async (req, res) => {
    await db.query('DELETE FROM cart WHERE user_id=?', [req.session.userId]);
    res.redirect('/cart');
  });

router
  .route('/cart/:cartId')
  .put(checkAuth, async (req, res) => {
    const { quantity } = req.body;
    const [[cartItem]] = await db.query(
      `SELECT inventory.quantity as inventoryQuantity
        FROM cart
        LEFT JOIN inventory on cart.inventory_id=inventory.id
        WHERE cart.id=? AND cart.user_id=?`,
      [req.params.cartId, req.session.userId]
    );
    if (!cartItem) return res.status(404).send('Not found');
    const { inventoryQuantity } = cartItem;
    if (quantity > inventoryQuantity) return res.status(409).send('Not enough inventory');
    if (quantity > 0) {
      await db.query(
        `UPDATE cart SET quantity=? WHERE id=? AND user_id=?`,
        [quantity, req.params.cartId, req.session.userId]
      );
    } else {
      await db.query(
        `DELETE FROM cart WHERE id=? AND user_id=?`,
        [req.params.cartId, req.session.userId]
      );
    }
    res.status(204).end();
  })
  .delete(checkAuth, async (req, res) => {
    const [{ affectedRows }] = await db.query(
      `DELETE FROM cart WHERE id=? AND user_id=?`,
      [req.params.cartId, req.session.userId]
    );
    if (affectedRows === 1) res.status(204).end();
    else res.status(404).send('Cart item not found');
  });

router.post('/user', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await db.query(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword]);
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

module.exports = router;

