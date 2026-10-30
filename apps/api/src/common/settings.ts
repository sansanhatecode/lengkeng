import { StoreSettings, StoreSettingsSchema } from '@lengkeng/shared';

/** Đọc settings JSON của cửa hàng, điền mặc định cho trường thiếu. */
export const parseSettings = (raw: unknown): StoreSettings => {
  const r = StoreSettingsSchema.safeParse(raw ?? {});
  return r.success ? r.data : StoreSettingsSchema.parse({});
};
