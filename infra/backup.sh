#!/bin/sh
# Sao lưu Postgres hàng ngày, giữ 30 ngày, đẩy lên Cloudflare R2 (tương thích S3).
set -e
STAMP=$(date +%Y%m%d-%H%M)
FILE=/backups/lengkeng-$STAMP.sql.gz
pg_dump -h postgres -U lengkeng lengkeng | gzip > "$FILE"
find /backups -name 'lengkeng-*.sql.gz' -mtime +30 -delete
if [ -n "$R2_BUCKET" ]; then
  aws s3 cp "$FILE" "s3://$R2_BUCKET/db/" --endpoint-url "$R2_ENDPOINT" --only-show-errors
fi
echo "backup ok $FILE"
