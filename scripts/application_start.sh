#!/bin/bash
set -e

# systemd 서비스 파일을 시스템 위치로 복사 후 앱 시작
cp /home/ec2-user/app/deploy/oliveyoung.service /etc/systemd/system/oliveyoung.service

systemctl daemon-reload
systemctl enable oliveyoung
systemctl restart oliveyoung

echo "oliveyoung 서비스 시작됨"
