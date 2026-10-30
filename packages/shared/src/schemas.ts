import { z } from 'zod';
import {
  KitchenStatus,
  PaymentMethod,
  Plan,
  SubscriptionStatus,
  ServiceRequestType,
  SessionOpenMode,
  StaffRole,
  Station,
} from './enums';

const enumValues = <T extends Record<string, string>>(e: T) =>
  Object.values(e) as [T[keyof T], ...T[keyof T][]];

export const StoreSettingsSchema = z.object({
  requireOrderConfirm: z.boolean().default(false),
  requireFirstOrderConfirm: z.boolean().default(true),
  sessionOpenMode: z.enum(enumValues(SessionOpenMode)).default('ON_SCAN'),
  vatPercent: z.number().min(0).max(100).default(0),
  autoCloseSessionHours: z.number().int().min(1).max(24).default(4),
  languages: z.array(z.enum(['vi', 'en'])).default(['vi']),
  currency: z.literal('VND').default('VND'),
});
export type StoreSettings = z.infer<typeof StoreSettingsSchema>;

export const CartModifierSchema = z.object({
  groupId: z.string(),
  modifierId: z.string(),
});

export const CartLineSchema = z.object({
  /** id do client sinh để sửa/xóa dòng */
  lineId: z.string().min(1),
  menuItemId: z.string().min(1),
  qty: z.number().int().min(1).max(99),
  modifiers: z.array(CartModifierSchema).default([]),
  note: z.string().max(200).optional(),
  addedBy: z.string().max(40).optional(),
});
export type CartLine = z.infer<typeof CartLineSchema>;

export const CartSchema = z.object({ lines: z.array(CartLineSchema).max(100) });
export type Cart = z.infer<typeof CartSchema>;

export const CreateOrderSchema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  lines: z.array(CartLineSchema.omit({ lineId: true, addedBy: true })).min(1).max(100),
  note: z.string().max(200).optional(),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const CreateServiceRequestSchema = z.object({
  type: z.enum(enumValues(ServiceRequestType)),
});

export const UpdateKitchenStatusSchema = z.object({
  status: z.enum(enumValues(KitchenStatus)),
});

export const RejectOrderSchema = z.object({ reason: z.string().max(200).optional() });

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  deviceName: z.string().max(60).optional(),
});

export const PinLoginSchema = z.object({ pin: z.string().regex(/^\d{4,6}$/) });

export const PaymentInputSchema = z.object({
  method: z.enum(enumValues(PaymentMethod)),
  amount: z.number().int().min(0),
  txnRef: z.string().max(100).optional(),
});

export const CloseSessionSchema = z.object({
  payments: z.array(PaymentInputSchema).min(1),
  discount: z.number().int().min(0).default(0),
  surcharge: z.number().int().min(0).default(0),
});

export const OpenSessionSchema = z.object({ guestCount: z.number().int().min(1).max(50).optional() });

// Quản trị menu
export const CategoryInputSchema = z.object({
  nameVi: z.string().min(1).max(80),
  nameEn: z.string().max(80).optional(),
  sortOrder: z.number().int().default(0),
  availableFrom: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  availableTo: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

export const ModifierInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(60),
  priceDelta: z.number().int().default(0),
  isAvailable: z.boolean().default(true),
});

export const ModifierGroupInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(60),
  required: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  modifiers: z.array(ModifierInputSchema).max(30),
});

export const MenuItemInputSchema = z.object({
  categoryId: z.string(),
  nameVi: z.string().min(1).max(120),
  nameEn: z.string().max(120).optional(),
  descVi: z.string().max(500).optional(),
  descEn: z.string().max(500).optional(),
  price: z.number().int().min(0),
  imageUrl: z.string().url().optional().nullable(),
  station: z.enum(enumValues(Station)).default('KITCHEN'),
  tags: z.array(z.string().max(20)).max(10).default([]),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  modifierGroups: z.array(ModifierGroupInputSchema).max(10).default([]),
});

export const AvailabilitySchema = z.object({ isAvailable: z.boolean() });

export const AreaInputSchema = z.object({ name: z.string().min(1).max(60), sortOrder: z.number().int().default(0) });

export const TableInputSchema = z.object({ areaId: z.string(), name: z.string().min(1).max(30) });

export const StaffInputSchema = z.object({
  name: z.string().min(1).max(80),
  role: z.enum(enumValues(StaffRole)),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6).optional(),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
  isActive: z.boolean().default(true),
});

// ---------- Đa quán: tự đăng ký & quản trị hệ thống (A1) ----------

/** Chủ quán tự tạo quán mới. Tạo luôn khu vực + bàn mặc định để quét QR được ngay. */
export const RegisterStoreSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  address: z.string().trim().max(200).optional(),
  ownerName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  /** PIN để chủ quán đổi ca trên thiết bị chung; để trống thì chưa có */
  pin: z.string().regex(/^\d{4,6}$/).optional(),
  tableCount: z.number().int().min(1).max(100).default(10),
});
export type RegisterStoreInput = z.infer<typeof RegisterStoreSchema>;

export const PlatformLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
});

/** Quản trị hệ thống tạo quán hộ khách (bán hàng qua điện thoại, cài đặt tại quán). */
export const PlatformCreateStoreSchema = RegisterStoreSchema.extend({
  plan: z.enum(enumValues(Plan)).default('FREE'),
  trialDays: z.number().int().min(0).max(365).default(30),
});

export const PlatformUpdateStoreSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
  suspendedReason: z.string().trim().max(200).nullable().optional(),
  plan: z.enum(enumValues(Plan)).optional(),
  subscriptionStatus: z.enum(enumValues(SubscriptionStatus)).optional(),
  /** ISO date; null = không hết hạn */
  endsAt: z.string().datetime().nullable().optional(),
});
