/** Giờ hiện tại theo múi giờ Việt Nam dạng "HH:mm" để so với khung giờ bán. */
export const nowHHmmVn = (d = new Date()): string =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

/** Mốc 0h hôm nay theo giờ Việt Nam, trả về Date UTC. */
export const startOfTodayVn = (d = new Date()): Date => {
  const vn = new Date(d.getTime() + 7 * 3600 * 1000);
  vn.setUTCHours(0, 0, 0, 0);
  return new Date(vn.getTime() - 7 * 3600 * 1000);
};

export const inTimeWindow = (from?: string | null, to?: string | null, now = nowHHmmVn()): boolean => {
  if (!from || !to) return true;
  return from <= to ? now >= from && now <= to : now >= from || now <= to;
};
