const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// 시드 데이터가 sha256 해시를 사용하므로 동일 방식으로 통일합니다.
function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

// 회원가입
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ message: '이메일, 비밀번호, 이름을 모두 입력해주세요.' });
  }

  try {
    const exists = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
    }

    const result = await db.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [email, hashPassword(password), name]
    );
    const user = result.rows[0];

    // 회원가입과 동시에 장바구니 생성
    await db.query('INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [user.id]);

    req.session.userId = user.id;
    req.session.userName = user.name;
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '회원가입 중 오류가 발생했습니다.' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
  }

  try {
    const result = await db.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 로그인 사용자에게 장바구니가 없으면 생성
    await db.query('INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [user.id]);

    req.session.userId = user.id;
    req.session.userName = user.name;
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '로그인 중 오류가 발생했습니다.' });
  }
});

// 로그아웃
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: '로그아웃 되었습니다.' });
  });
});

// 현재 로그인 정보
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }
  res.json({ id: req.session.userId, name: req.session.userName });
});

module.exports = router;
