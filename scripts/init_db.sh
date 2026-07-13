#!/bin/bash
set -e

# DB 초기화 (스키마 + CSV 데이터). "테이블이 없을 때만" 실행하므로
# 재배포해도 기존 데이터를 덮어쓰지 않습니다.

# app.env 에서 DB 접속정보 로드
set -a
. /home/ec2-user/app.env
set +a
export PGPASSWORD="$PGPASSWORD"

cd /home/ec2-user/app

# psql 없으면 설치
command -v psql >/dev/null 2>&1 || sudo yum install -y postgresql15

# 1) 데이터베이스 없으면 생성 (RDS 기본 DB는 var.db_name 으로 이미 생성됨 → 있으면 통과)
psql -h "$PGHOST" -U "$PGUSER" -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='$PGDATABASE'" | grep -q 1 \
  || psql -h "$PGHOST" -U "$PGUSER" -d postgres -c "CREATE DATABASE \"$PGDATABASE\""

# 2) users 테이블이 이미 있으면 적재 건너뜀
if psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -tc \
     "SELECT to_regclass('public.users')" | grep -qw users; then
  echo "이미 초기화됨 — 데이터 적재 건너뜀"
else
  echo "스키마 생성..."
  psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f sql/schema.sql
  echo "CSV 데이터 적재..."
  psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f sql/load.sql
  echo "DB 초기화 완료"
fi
