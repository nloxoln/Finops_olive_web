require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const db = require('./db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');

const app = express();

// ALB / CloudFront 뒤에 있을 때 X-Forwarded-* 헤더를 신뢰해야
// secure 쿠키와 클라이언트 IP 가 정상 동작합니다.
app.set('trust proxy', 1);

app.use(express.json());

const isProd = process.env.NODE_ENV === 'production';
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // 운영(HTTPS/CloudFront)에서는 secure 쿠키 사용
      secure: isProd,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1일
    },
  })
);

// ALB 대상 그룹 헬스체크용 (DB 연결까지 확인)
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'db_error' });
  }
});

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// 정적 프론트엔드
app.use(express.static(path.join(__dirname, '..', 'public')));

// 0.0.0.0 바인딩 (컨테이너 외부에서 접근 가능하도록)
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`올리브영 서버 실행: http://localhost:${PORT}`);
});
