# 배포 가이드 (GitHub + Vercel)

## 1. 데이터

- 로컬에서 `data/` 아래에 CSV를 두거나, Vercel **Environment Variables**에 `PODOMEDIA_DATA_ROOT` 를 설정하세요.
- 용량이 크면 Git에 커밋하지 말고, 별도 스토리지 + 빌드 시 동기화 등을 검토하세요.

## 2. GitHub

```bash
cd podomedia-dashboard
git init
git add -A
git commit -m "Initial commit: 상권·세그먼트 인사이트 대시보드"
```

GitHub에서 빈 저장소를 만든 뒤:

```bash
git remote add origin https://github.com/<계정>/<저장소>.git
git branch -M main
git push -u origin main
```

## 3. Vercel

1. [vercel.com](https://vercel.com) 로그인 → **Add New Project** → GitHub 저장소 연결  
2. **Root Directory** 가 이 Next 앱 루트인지 확인  
3. Framework: **Next.js** 자동 인식  
4. 필요 시 Environment Variable: `PODOMEDIA_DATA_ROOT`  
5. **Deploy** → 완료 후 **Production URL** 을 고객사에 전달

## 4. 빌드 확인 (로컬)

```bash
npm ci
npm run build
```
