-- Dọn dữ liệu cũ: bàn có nhiều phiên OPEN thì giữ phiên có đơn (hoặc phiên mới nhất), hủy các phiên còn lại.
WITH ranked AS (
  SELECT s.id,
         ROW_NUMBER() OVER (
           PARTITION BY s."tableId"
           ORDER BY (SELECT COUNT(*) FROM "Order" o WHERE o."sessionId" = s.id) DESC, s."openedAt" DESC, s.id
         ) AS rn
  FROM "TableSession" s
  WHERE s.status = 'OPEN'
)
, losers AS (SELECT id FROM ranked WHERE rn > 1)
, voided_bills AS (
  UPDATE "Bill" b SET status = 'VOID' WHERE b."sessionId" IN (SELECT id FROM losers) AND b.status = 'OPEN' RETURNING b.id
)
UPDATE "TableSession" SET status = 'CLOSED', "closedAt" = NOW()
WHERE id IN (SELECT id FROM losers);

-- Mỗi bàn chỉ có tối đa một phiên OPEN. Prisma chưa mô tả được partial index nên viết SQL tay.
CREATE UNIQUE INDEX "TableSession_one_open_per_table"
  ON "TableSession" ("tableId") WHERE status = 'OPEN';
