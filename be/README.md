# AITA Backend (`be/`)

API Node.js cho frontend `FE/`.

## Chạy nhanh

```bash
cd be
cp .env.example .env   # nếu chưa có .env
npm install
npm run setup        # prisma + seed
npm run dev          # http://localhost:3001
```

## Tài khoản demo

| Email | Mật khẩu | Cổng FE |
|-------|----------|---------|
| admin@fpt.edu.vn | admin123 | /admin |
| lecturer@fpt.edu.vn | lecturer123 | /lecturer |
| student@fpt.edu.vn | student123 | /student |

## FE kết nối

Trong thư mục `FE`:

```bash
npm run dev   # proxy /api → localhost:3001
```

Đăng nhập tại `/login` trước khi vào dashboard.

## API map FE

Xem `src/routes/index.ts` — tất cả endpoint dưới prefix `/api`.
