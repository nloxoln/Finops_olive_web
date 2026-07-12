// 로그인이 필요한 API 보호용 미들웨어
module.exports = function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }
  next();
};
