const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// 주문 목록
router.get('/', async (req, res) => {
  try {
    const orders = await db.query(
      `SELECT id, total_amount, status, created_at
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC, id DESC`,
      [req.session.userId]
    );

    const items = await db.query(
      `SELECT oi.order_id, oi.quantity, oi.price_at_purchase,
              p.id AS product_id, p.name, p.brand_name, p.thumbnail_url
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = $1
       ORDER BY oi.id`,
      [req.session.userId]
    );

    const itemsByOrder = {};
    for (const it of items.rows) {
      (itemsByOrder[it.order_id] ||= []).push(it);
    }

    res.json(
      orders.rows.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '주문 내역을 불러오지 못했습니다.' });
  }
});

// 주문 생성
//  - body 에 items([{productId, quantity}]) 가 있으면 해당 상품으로 바로 주문 (바로 구매)
//  - 없으면 장바구니 전체를 주문
router.post('/', async (req, res) => {
  const userId = req.session.userId;
  const directItems = Array.isArray(req.body?.items) ? req.body.items : null;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 주문할 항목 결정
    let lines; // [{ product_id, quantity }]
    let cartId = null;

    if (directItems && directItems.length > 0) {
      lines = directItems
        .map((i) => ({ product_id: Number(i.productId), quantity: Number(i.quantity) || 1 }))
        .filter((i) => i.product_id && i.quantity > 0);
    } else {
      const cart = await client.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
      if (cart.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: '장바구니가 비어 있습니다.' });
      }
      cartId = cart.rows[0].id;
      const cartItems = await client.query(
        'SELECT product_id, quantity FROM cart_items WHERE cart_id = $1',
        [cartId]
      );
      lines = cartItems.rows;
    }

    if (!lines || lines.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: '주문할 상품이 없습니다.' });
    }

    // 상품 정보 조회(행 잠금) + 재고 검증 + 합계 계산
    let total = 0;
    const resolved = [];
    for (const line of lines) {
      const p = await client.query(
        'SELECT id, name, price, stock_quantity FROM products WHERE id = $1 FOR UPDATE',
        [line.product_id]
      );
      if (p.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `상품(${line.product_id})을 찾을 수 없습니다.` });
      }
      const product = p.rows[0];
      if (product.stock_quantity < line.quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: `재고가 부족합니다: ${product.name}` });
      }
      total += product.price * line.quantity;
      resolved.push({ ...product, quantity: line.quantity });
    }

    // 주문 생성
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, status)
       VALUES ($1, $2, '주문완료') RETURNING id, created_at`,
      [userId, total]
    );
    const orderId = orderResult.rows[0].id;

    // 주문 항목 저장 + 재고 차감
    for (const item of resolved) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.id, item.quantity, item.price]
      );
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.id]
      );
    }

    // 장바구니 주문이었다면 장바구니 비우기
    if (cartId !== null) {
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    }

    await client.query('COMMIT');
    res.status(201).json({ orderId, total });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: '주문 처리 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
});

module.exports = router;
