# Web Push Notification with Database

웹푸시 알림을 데이터베이스와 함께 사용하는 Next.js 애플리케이션입니다.

## 기능

- 웹푸시 구독 등록/해제
- 푸쉬 알림 발송
- 구독 정보를 PostgreSQL 데이터베이스에 저장
- Prisma ORM 사용

## 설정 방법

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# VAPID Keys for Web Push
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Database URLs (Vercel Postgres)
DATABASE_URL=your_database_url
POSTGRES_URL=your_postgres_url
PRISMA_DATABASE_URL=your_prisma_database_url
```

### 2. VAPID 키 생성

```bash
npx web-push generate-vapid-keys
```

### 3. 데이터베이스 마이그레이션

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스에 스키마 적용 (Vercel 배포 시)
npm run db:push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

## Vercel 배포 시 필요한 작업

1. **환경 변수 설정**: Vercel 대시보드에서 환경 변수 추가
2. **데이터베이스 연결**: Vercel Postgres 데이터베이스 생성 및 연결
3. **마이그레이션 실행**: 배포 후 데이터베이스 스키마 적용

## API 엔드포인트

- `POST /api/push/register` - 푸쉬 구독 등록
- `DELETE /api/push/register` - 푸쉬 구독 해제
- `GET /api/push/register` - 구독자 수 조회
- `POST /api/push/send` - 푸쉬 알림 발송
- `GET /api/push/send` - 구독자 목록 조회

## 사용된 기술

- Next.js 15
- Prisma ORM
- PostgreSQL
- Web Push API
- TypeScript
- Tailwind CSS