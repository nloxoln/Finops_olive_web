const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// 사용자의 장바구니 id 조회(없으면 생성)
async function getCartId(userId) {
  const existing = await db.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
  if (existing.rowCount > 0) return existing.rows[0].id;
  const created = await db.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
  return created.rows[0].id;
}

// 장바구니 조회
router.get('/', async (req, res) => {
  try {
    const cartId = await getCartId(req.session.userId);
    const result = await db.query(
      `SELECT ci.id AS cart_item_id, ci.quantity,
              p.id AS product_id, p.name, p.brand_name, p.price, p.thumbnail_url,
              (p.price * ci.quantity) AS subtotal
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       ORDER BY ci.id`,
      [cartId]
    );
    const total = result.rows.reduce((sum, r) => sum + Number(r.subtotal), 0);
    res.json({ items: result.rows, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '장바구니를 불러오지 못했습니다.' });
  }
});

// 장바구니에 담기 (있으면 수량 증가)
router.post('/items', async (req, res) => {
  const { productId, quantity } = req.body || {};
  const qty = Number(quantity) || 1;
  if (!productId || qty < 1) {
    return res.status(400).json({ message: '상품과 수량을 확인해주세요.' });
  }

  try {
    const product = await db.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (product.rowCount === 0) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    const cartId = await getCartId(req.session.userId);
    await db.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [cartId, productId, qty]
    );
    res.status(201).json({ message: '장바구니에 담았습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '장바구니 담기에 실패했습니다.' });
  }
});

// 장바구니 항목 수량 변경
router.patch('/items/:id', async (req, res) => {
  const qty = Number(req.body?.quantity);
  if (!qty || qty < 1) {
    return res.status(400).json({ message: '수량은 1 이상이어야 합니다.' });
  }
  try {
    const cartId = await getCartId(req.session.userId);
    const result = await db.query(
      'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3',
      [qty, req.params.id, cartId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: '장바구니 항목을 찾을 수 없습니다.' });
    }
    res.json({ message: '수량을 변경했습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '수량 변경에 실패했습니다.' });
  }
});

// 장바구니 항목 삭제
router.delete('/items/:id', async (req, res) => {
  try {
    const cartId = await getCartId(req.session.userId);
    const result = await db.query(
      'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2',
      [req.params.id, cartId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: '장바구니 항목을 찾을 수 없습니다.' });
    }
    res.json({ message: '삭제했습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '삭제에 실패했습니다.' });
  }
});

module.exports = router;
