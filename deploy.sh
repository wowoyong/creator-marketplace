#!/bin/bash
set -e

echo "========================================="
echo "  Creator Marketplace - Deploy Script"
echo "========================================="

PROJECT_DIR="$HOME/WebstormProjects/creator-marketplace"
cd "$PROJECT_DIR"

# 로그 디렉토리 생성
mkdir -p logs

echo ""
echo "[1/6] Git pull..."
git pull origin main

echo ""
echo "[2/6] Backend: install & build..."
cd "$PROJECT_DIR/backend"
npm install --production=false
npx prisma generate
npx prisma migrate deploy
npm run build

echo ""
echo "[3/6] Frontend: install & build..."
cd "$PROJECT_DIR/frontend"
npm install --production=false
npm run build

echo ""
echo "[4/6] Starting services with PM2..."
cd "$PROJECT_DIR"

# PM2가 설치되어 있는지 확인
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  npm install -g pm2
fi

# 기존 프로세스 중지 후 재시작
pm2 delete cm-api cm-web 2>/dev/null || true
pm2 start ecosystem.config.js --env production

echo ""
echo "[5/6] Saving PM2 process list..."
pm2 save

echo ""
echo "[6/6] Status check..."
pm2 status

echo ""
echo "========================================="
echo "  Deployment complete!"
echo "  API: http://localhost:4001"
echo "  Web: http://localhost:4000"
echo "========================================="
