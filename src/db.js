const { Pool } = require('pg');

// 환경변수(PG*)로 접속. 로컬에서는 .env, AWS에서는 ECS task definition 의
// environment / secrets 로 주입됩니다.
//
// RDS 는 기본적으로 SSL 접속을 권장하므로 PGSSL=true 일 때 SSL 을 켭니다.
// (RDS 인증서 검증까지 하려면 rejectUnauthorized:true + CA 번들 필요.
//  여기서는 간단히 암호화만 사용)
const useSSL = String(process.env.PGSSL).toLowerCase() === 'true';

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PGPOOL_MAX) || 10,
});

pool.on('error', (err) => {
  console.error('예상치 못한 DB 풀 오류:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
