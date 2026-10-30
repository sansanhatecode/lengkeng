# Khôi phục cơ sở dữ liệu

Mục tiêu: khôi phục trong 4 giờ, mất dữ liệu tối đa 24 giờ (mục 5 spec).

1. Lấy file sao lưu mới nhất: trong volume `backups` của container `backup`, hoặc tải từ R2 (`aws s3 ls s3://$R2_BUCKET/db/ --endpoint-url $R2_ENDPOINT`).
2. Dừng API: `docker compose -f infra/docker-compose.yml stop api`.
3. Khôi phục:
   ```sh
   gunzip -c lengkeng-YYYYMMDD-HHMM.sql.gz | docker compose -f infra/docker-compose.yml exec -T postgres psql -U lengkeng -d lengkeng
   ```
   Nếu DB đã có dữ liệu hỏng, tạo DB mới trước: `dropdb` + `createdb` bằng `psql -U lengkeng -d postgres`.
4. Khởi động lại API: `docker compose -f infra/docker-compose.yml start api`.
5. Thử khôi phục trên máy dev ít nhất một lần trước khi vào thí điểm (cổng kiểm tra giai đoạn 1).
