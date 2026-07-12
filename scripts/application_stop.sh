#!/bin/bash
# 실행 중인 서비스가 있으면 정지 (없어도 배포가 실패하지 않도록 true)
if systemctl list-unit-files | grep -q oliveyoung.service; then
  systemctl stop oliveyoung || true
fi
exit 0
