# AITA Frontend (`FE/`)

Giao diện AITA — 4 cổng: Home, Admin, Giảng viên, Sinh viên.

## Chạy (cần backend)

**Terminal 1 — Backend:**

```bash
cd ../be
npm run dev
```

**Terminal 2 — Frontend:**

```bash
npm install
npm run dev
```

- Trang chủ: http://localhost:5173
- Đăng nhập: http://localhost:5173/login
- API proxy: `/api` → `http://localhost:3001`

## Đăng nhập demo

| Email | Mật khẩu |
|-------|----------|
| admin@fpt.edu.vn | admin123 |
| lecturer@fpt.edu.vn | lecturer123 |
| student@fpt.edu.vn | student123 |

Sau đăng nhập tự chuyển đúng cổng theo vai trò.

## Cấu trúc

| Route | Mô tả |
|-------|--------|
| `/` | Giới thiệu |
| `/login` | Đăng nhập |
| `/admin/*` | Quản trị |
| `/lecturer/*` | Giảng viên |
| `/student/*` | Sinh viên |

API client: `src/lib/api.ts`
