# Lengkeng · Hệ thống gọi món QR tại bàn

Monorepo cho web khách, app nhân viên và API. Spec đầy đủ ở [Spec Hệ thống gọi món QR tại bàn.md](./Spec%20H%E1%BB%87%20th%E1%BB%91ng%20g%E1%BB%8Di%20m%C3%B3n%20QR%20t%E1%BA%A1i%20b%C3%A0n.md), kiến trúc ở mục 7, cấu trúc repo ở mục 11.

```
apps/api        NestJS + Prisma + Socket.IO        http://localhost:3000  (docs: /docs)
apps/customer   Web khách (PWA, quét QR)           http://localhost:5173
apps/console    App nhân viên + quản trị quán      http://localhost:5174
                Quản trị hệ thống (mọi quán)       http://localhost:5174/sys
packages/shared Enum, schema Zod, sự kiện realtime dùng chung
infra/          Docker Compose (dev + prod), Caddy, sao lưu
e2e/            Playwright: trọn luồng gọi món → đóng bàn, tạo quán mới, quét QR đồng thời
```

## Chạy lần đầu

Cần Node 22+, Docker. pnpm được bật qua `corepack enable`.

```sh
pnpm install
pnpm db:up                                  # Postgres trong Docker
cp apps/api/.env.example apps/api/.env
pnpm --filter @lengkeng/shared build
pnpm db:migrate                             # prisma migrate dev
pnpm db:seed                                # tài khoản quản trị hệ thống + quán demo + menu + nhân viên
pnpm dev                                    # api + customer + console cùng lúc
```

Tài khoản demo: `owner@demo.vn` / `password123`. PIN đổi ca: phục vụ `1111`, bếp `2222`, thu ngân `3333`, chủ quán `0000`.
Link QR bàn đầu tiên được in ra khi seed. Trong app nhân viên vào **Bàn & QR → In tem QR** để lấy toàn bộ.

## Nhiều quán trên một hệ thống

Một API và một CSDL phục vụ mọi quán; mỗi bản ghi đều gắn `storeId`, token đăng nhập mang `storeId` nên quán này không thấy dữ liệu quán kia. Có ba cách để có quán mới:

| Cách | Ai làm | Ở đâu |
| --- | --- | --- |
| Tự đăng ký | Chủ quán | http://localhost:5174/register → điền tên quán, số bàn, email, mật khẩu. Tạo xong vào thẳng **Bàn & QR** để in tem; dùng thử 30 ngày gói Miễn phí |
| Tạo hộ | Đội vận hành | http://localhost:5174/sys → **Tạo quán hộ khách**, chọn gói và số ngày dùng thử, nhận thông tin đăng nhập để gửi chủ quán |
| API | Script | `POST /auth/register` hoặc `POST /p/stores` (xem `/docs`) |

Trang quản trị hệ thống `/sys` liệt kê mọi quán (chủ quán, gói, hạn, số bàn, số đơn 7 ngày), cho **khóa/mở** quán và đổi **gói cước**. Quán bị khóa thì nhân viên không đăng nhập được và khách quét QR thấy "Quán tạm ngưng nhận đơn qua QR".
Tài khoản quản trị hệ thống tạo khi seed: `admin@lengkeng.vn` / `admin12345` (đổi qua `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD` trong `.env` trước khi seed trên máy chủ thật).

## Lệnh hay dùng

| Lệnh | Việc |
| --- | --- |
| `pnpm typecheck` | Kiểm tra kiểu toàn repo |
| `pnpm build` | Build tất cả (Turborepo chỉ build phần đổi) |
| `pnpm e2e` | Playwright trọn luồng, tự bật api + 2 frontend từ bản build |
| `pnpm --filter @lengkeng/api prisma:migrate` | Tạo migration mới sau khi sửa `schema.prisma` |
| `docker build -f apps/api/Dockerfile .` | Image API cho production |

## Luồng xác thực

- Quản lý đăng nhập email + mật khẩu, nhận token 12 giờ. Nếu đánh dấu "thiết bị dùng chung" thì nhận thêm token thiết bị 30 ngày.
- Nhân viên đổi ca trên thiết bị bằng PIN, nhận token 12 giờ gắn với thiết bị. PIN duy nhất trong quán.
- Khách quét QR nhận mã phiên 12 giờ gắn với phiên bàn. Đóng bàn thì mã hết hiệu lực dù chưa hết hạn. Nhiều khách quét cùng lúc vẫn chỉ có một phiên: API khóa dòng bàn khi mở phiên và CSDL có unique index "một phiên OPEN mỗi bàn".
- Quản trị hệ thống đăng nhập riêng tại `/sys`, token 8 giờ loại `platform`, không gọi được API của quán và ngược lại.

## Deploy

Frontend lên Cloudflare Pages, API chạy Docker trên 1 VPS với Caddy và Postgres. Xem `infra/docker-compose.yml`, `infra/.env.prod.example`, `infra/RESTORE.md`. Workflow `deploy.yml` chặn deploy trong giờ cao điểm 11–13h và 18–21h.
