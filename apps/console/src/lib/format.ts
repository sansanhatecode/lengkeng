export { formatVnd } from '@lengkeng/shared';
export const time = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
export const minutesSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
