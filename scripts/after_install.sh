#!/bin/bash
set -e

cd /home/ec2-user/app

# 운영 의존성만 설치
echo "npm 의존성 설치 중..."
npm ci --omit=dev
