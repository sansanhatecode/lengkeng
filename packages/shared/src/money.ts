/** VND không có phần lẻ. */
export const formatVnd = (amount: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    amount,
  );
