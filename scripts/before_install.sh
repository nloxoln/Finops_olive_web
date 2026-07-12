#!/bin/bash
set -e

# Node.js 가 없으면 설치 (Amazon Linux 2023 기준, Node 20)
if ! command -v node > /dev/null 2>&1; then
  echo "Node.js 설치 중..."
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  yum install -y nodejs
fi

# 배포 디렉터리 준비 (이전 배포 잔여 파일 정리)
APP_DIR=/home/ec2-user/app
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"
chown -R ec2-user:ec2-user "$APP_DIR"
