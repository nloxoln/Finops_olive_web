const express = require('express');
const db = require('../db');

const router = express.Router();

// 상품 목록 (선택: category, q 검색어)
router.get('/', async (req, res) => {
  const { category, q } = req.query;
  const conditions = [];
  const params = [];

  if (category) {
    params.push(category);
    conditions.push(`category_name = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(name ILIKE $${params.length} OR brand_name ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await db.query(
      `SELECT id, brand_name, category_name, name, price, stock_quantity, thumbnail_url, description
       FROM products ${where}
       ORDER BY id`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '상품 목록을 불러오지 못했습니다.' });
  }
});

// 카테고리 목록
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT category_name FROM products ORDER BY category_name'
    );
    res.json(result.rows.map((r) => r.category_name));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '카테고리를 불러오지 못했습니다.' });
  }
});

// 상품 상세
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, brand_name, category_name, name, price, stock_quantity, thumbnail_url, description
       FROM products WHERE id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '상품을 불러오지 못했습니다.' });
  }
});

module.exports = router;
