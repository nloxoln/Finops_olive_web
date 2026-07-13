# 🫒 OLIVE YOUNG Clone

올리브영 미니 클론입니다. **회원가입 · 로그인 · 상품목록 · 장바구니 · 주문** 5가지 핵심 기능만 담았습니다.

- **Backend**: Node.js + Express (세션 기반 인증)
- **Frontend**: 정적 HTML/CSS/Vanilla JS (`public/`)
- **DB**: PostgreSQL (RDS)
- **배포**: GitHub → GitHub Actions → CodeDeploy → EC2 → RDS(PostgreSQL)

---

## 아키텍처

```
Dev ── push ──▶ GitHub ──▶ GitHub Actions ──▶ (S3 번들) ──▶ CodeDeploy
                                                                 │
                                                                 ▼
User ──▶ CloudFront ──▶ ALB ──▶ [ EC2: Node 앱(systemd) ] ──▶ [ RDS PostgreSQL(Private) ]
```

- **GitHub Actions** (`.github/workflows/deploy.yml`): main 에 push 되면 배포 번들을 S3 에 올리고 CodeDeploy 배포를 트리거합니다.
- **CodeDeploy** (`appspec.yml` + `scripts/`): EC2 에이전트가 파일을 내려받아 `npm ci` → systemd 서비스로 앱을 재시작합니다.
- **EC2**: `deploy/oliveyoung.service` (systemd) 로 앱이 상시 실행되고, 죽으면 자동 재시작됩니다.
- **RDS**: `PGSSL=true` 로 SSL 접속. 접속정보는 EC2 의 `app.env` (또는 SSM) 로 주입합니다.
- ALB 헬스체크 경로는 `/health` 를 사용합니다.

---

## 폴더 구조

```
oliveyoung/
├─ appspec.yml                    # CodeDeploy 배포 정의
├─ .github/workflows/deploy.yml   # GitHub Actions 배포 워크플로
├─ scripts/                       # CodeDeploy 생명주기 훅 스크립트
│  ├─ before_install.sh           #   Node 설치 + 디렉터리 준비
│  ├─ after_install.sh            #   npm ci
│  ├─ application_start.sh        #   systemd 서비스 시작
│  └─ application_stop.sh         #   기존 서비스 정지
├─ deploy/oliveyoung.service      # systemd 서비스 정의(EC2)
├─ .env.example                   # 환경변수 템플릿 (.env 는 git 제외)
├─ package.json
├─ sql/
│  ├─ schema.sql         # 테이블 정의 (DDL)
│  └─ load.sql           # CSV 초기 데이터 적재
├─ src/
│  ├─ server.js          # Express 진입점 (/health, 세션, 라우팅)
│  ├─ db.js              # pg 커넥션 풀 (SSL 지원)
│  ├─ middleware/
│  │  └─ requireAuth.js  # 로그인 필요 API 가드
│  └─ routes/
│     ├─ auth.js         # 인증
│     ├─ products.js     # 상품
│     ├─ cart.js         # 장바구니
│     └─ orders.js       # 주문
└─ public/               # 프론트엔드 페이지
   ├─ index.html         # 상품 목록
   ├─ login.html / register.html
   ├─ product.html       # 상품 상세
   ├─ cart.html          # 장바구니
   └─ orders.html        # 주문 내역
```

---

## 로컬 실행

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 준비
cp .env.example .env      # Windows: copy .env.example .env
# .env 안의 PGPASSWORD 등을 본인 환경에 맞게 수정

# 3) DB 준비 (최초 1회) — 프로젝트 루트에서 실행
psql -U postgres -c "CREATE DATABASE oliveyoung ENCODING 'UTF8';"
psql -U postgres -d oliveyoung -f sql/schema.sql
psql -U postgres -d oliveyoung -f sql/load.sql

# 4) 서버 실행
npm start
# ▶ http://localhost:3000
```

**테스트 계정**: `user1@example.com` / `password1` (패턴: `user{N}@example.com` / `password{N}`, N=1~100)

---

## 인증 방식

세션 쿠키 기반입니다. 로그인 성공 시 `connect.sid` 쿠키가 발급되고, 보호된 API(`/api/cart`, `/api/orders`)는 이 세션을 확인합니다.

> 비밀번호는 시드 데이터 호환을 위해 `SHA-256` 해시를 사용합니다. (실서비스라면 bcrypt 권장)

---

## API 명세

Base URL: `/api` · 요청/응답 본문은 모두 `application/json`

### 헬스체크

| Method | Path | 설명 |
|---|---|---|
| GET | `/health` | 서버 + DB 상태 확인 (ALB 헬스체크용) |

```
200 { "status": "ok" }
503 { "status": "db_error" }
```

---

### 1. 인증 `/api/auth`

#### 회원가입
```
POST /api/auth/register
Body: { "email": "a@b.com", "password": "1234", "name": "홍길동" }

201 { "id": 101, "email": "a@b.com", "name": "홍길동" }
400 { "message": "이메일, 비밀번호, 이름을 모두 입력해주세요." }
409 { "message": "이미 가입된 이메일입니다." }
```
> 가입 성공 시 자동 로그인되고 장바구니가 함께 생성됩니다.

#### 로그인
```
POST /api/auth/login
Body: { "email": "user1@example.com", "password": "password1" }

200 { "id": 1, "email": "user1@example.com", "name": "김철수" }
401 { "message": "이메일 또는 비밀번호가 올바르지 않습니다." }
```

#### 로그아웃
```
POST /api/auth/logout
200 { "message": "로그아웃 되었습니다." }
```

#### 내 정보
```
GET /api/auth/me
200 { "id": 1, "name": "김철수" }
401 { "message": "로그인이 필요합니다." }
```

---

### 2. 상품 `/api/products`

#### 상품 목록
```
GET /api/products
GET /api/products?category=메이크업     # 카테고리 필터
GET /api/products?q=틴트                # 이름/브랜드 검색

200 [ { "id", "brand_name", "category_name", "name",
        "price", "stock_quantity", "thumbnail_url", "description" }, ... ]
```

#### 카테고리 목록
```
GET /api/products/categories
200 [ "메이크업", "미용소품", "바디케어", "스킨케어", "향수/디렉터", "헤어케어" ]
```

#### 상품 상세
```
GET /api/products/:id
200 { "id", "brand_name", ..., "description" }
404 { "message": "상품을 찾을 수 없습니다." }
```

---

### 3. 장바구니 `/api/cart` *로그인 필요*

#### 조회
```
GET /api/cart
200 {
  "items": [ { "cart_item_id", "quantity", "product_id", "name",
               "brand_name", "price", "thumbnail_url", "subtotal" } ],
  "total": 65000
}
```

#### 담기 (이미 있으면 수량 합산)
```
POST /api/cart/items
Body: { "productId": 18, "quantity": 2 }
201 { "message": "장바구니에 담았습니다." }
```

#### 수량 변경
```
PATCH /api/cart/items/:id
Body: { "quantity": 3 }
200 { "message": "수량을 변경했습니다." }
```

#### 삭제
```
DELETE /api/cart/items/:id
200 { "message": "삭제했습니다." }
```

---

### 4. 주문 `/api/orders` *로그인 필요*

#### 주문 생성
```
POST /api/orders

# (A) 장바구니 전체 주문 — body 없음
# (B) 바로 구매 — 특정 상품만
Body: { "items": [ { "productId": 20, "quantity": 1 } ] }

201 { "orderId": 32, "total": 10000 }
400 { "message": "장바구니가 비어 있습니다." }
409 { "message": "재고가 부족합니다: ..." }
```
> 트랜잭션으로 처리됩니다: **재고 검증 → 주문 생성 → 재고 차감 → (장바구니 주문 시) 장바구니 비우기**. 하나라도 실패하면 전체 롤백됩니다.

#### 주문 내역
```
GET /api/orders
200 [ { "id", "total_amount", "status", "created_at",
        "items": [ { "product_id", "name", "brand_name",
                     "quantity", "price_at_purchase", "thumbnail_url" } ] } ]
```

---

## 환경변수

| 변수 | 설명 | 예시 |
|---|---|---|
| `PGHOST` | DB 호스트 | RDS 엔드포인트 |
| `PGPORT` | DB 포트 | `5432` |
| `PGUSER` / `PGPASSWORD` | DB 계정 | |
| `PGDATABASE` | DB 이름 | `oliveyoung` |
| `PGSSL` | RDS SSL 사용 | 로컬 `false` / RDS `true` |
| `PGPOOL_MAX` | 커넥션 풀 최대 | `10` |
| `PORT` | 서버 포트 | `3000` |
| `NODE_ENV` | 실행 환경 | `production` 시 secure 쿠키 |
| `SESSION_SECRET` | 세션 서명 키 | 운영은 무작위 값 |

> EC2 에서는 이 값들을 `/home/ec2-user/app.env` 파일에 두면 systemd 가 읽어줍니다.
> 민감정보(`PGPASSWORD`, `SESSION_SECRET`)는 git 에 올리지 말고 EC2 에 직접 두거나 **SSM Parameter Store** 로 관리하세요.

---

## 배포 흐름 (GitHub Actions → CodeDeploy → EC2)

1. **GitHub Secrets 등록** (레포 Settings → Secrets and variables → Actions)
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — 배포 권한 IAM 사용자
   - `AWS_REGION` (예: `ap-northeast-2`), `S3_BUCKET`, `CODEDEPLOY_APP`, `CODEDEPLOY_GROUP`
2. **EC2 사전 준비** (콘솔에서)
   - CodeDeploy 에이전트 설치, IAM 역할(S3 읽기) 부여
   - `/home/ec2-user/app.env` 에 DB 접속정보 작성 (위 환경변수 참고)
3. **배포** — `main` 브랜치에 push 하면 자동으로:
   `GitHub Actions → S3 번들 업로드 → CodeDeploy → EC2 에서 npm ci → systemd 재시작`
4. **초기 데이터** — RDS 생성 후 최초 1회 스키마/데이터 적재:
   ```bash
   psql -h <RDS엔드포인트> -U postgres -d oliveyoung -f sql/schema.sql
   psql -h <RDS엔드포인트> -U postgres -d oliveyoung -f sql/load.sql
   ```
