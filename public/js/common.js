// 공통 API 헬퍼 & 헤더 렌더링

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const err = new Error((data && data.message) || '요청 실패');
    err.status = res.status;
    throw err;
  }
  return data;
}

function won(n) {
  return Number(n).toLocaleString('ko-KR') + '원';
}

// 현재 로그인 사용자 (없으면 null)
async function getMe() {
  try {
    return await api('/api/auth/me');
  } catch (_) {
    return null;
  }
}

// 헤더 렌더 (id="site-header" 요소가 있으면 채움)
async function renderHeader() {
  const host = document.getElementById('site-header');
  if (!host) return;
  const me = await getMe();
  const authLinks = me
    ? `<span>${me.name}님</span>
       <a href="/orders.html">주문배송</a>
       <a href="/cart.html">장바구니</a>
       <a href="#" id="logout-link">로그아웃</a>`
    : `<a href="/register.html">회원가입</a>
       <a href="/login.html">로그인</a>
       <a href="/cart.html">장바구니</a>
       <a href="/orders.html">주문배송</a>`;

  host.innerHTML = `
    <div class="topbar">
      ${authLinks}
      <a href="#">고객센터</a>
    </div>
    <div class="brandbar">
      <a href="/" class="logo">OLIVE YOUNG</a>
      <div class="search-box">
        <input type="text" id="search-input" placeholder="검색어를 입력하세요" />
        <button class="btn btn-dark btn-sm" id="search-btn" style="width:auto">검색</button>
      </div>
    </div>`;

  const logout = document.getElementById('logout-link');
  if (logout) {
    logout.addEventListener('click', async (e) => {
      e.preventDefault();
      await api('/api/auth/logout', { method: 'POST' });
      location.href = '/';
    });
  }

  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  const doSearch = () => {
    const q = searchInput.value.trim();
    location.href = q ? `/?q=${encodeURIComponent(q)}` : '/';
  };
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
}

document.addEventListener('DOMContentLoaded', renderHeader);
