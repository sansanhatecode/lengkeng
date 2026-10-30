import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CategoryInputSchema, MenuItemInputSchema, RealtimeEvent } from '@lengkeng/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { inTimeWindow } from '../common/time';

type CategoryInput = z.infer<typeof CategoryInputSchema>;
type MenuItemInput = z.infer<typeof MenuItemInputSchema>;

const itemInclude = {
  modifierGroups: { orderBy: { sortOrder: 'asc' }, include: { modifiers: { orderBy: { sortOrder: 'asc' } } } },
} satisfies Prisma.MenuItemInclude;

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Menu đầy đủ cho quản trị (kể cả món hết, danh mục ngoài giờ). */
  async fullMenu(storeId: string) {
    return this.prisma.category.findMany({
      where: { storeId },
      orderBy: { sortOrder: 'asc' },
      include: { items: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' }, include: itemInclude } },
    });
  }

  /** Menu cho khách: chỉ món còn hàng, danh mục trong khung giờ bán, bỏ tùy chọn hết hàng. */
  async customerMenu(storeId: string) {
    const cats = await this.fullMenu(storeId);
    return cats
      .filter((c) => inTimeWindow(c.availableFrom, c.availableTo))
      .map((c) => ({
        id: c.id,
        nameVi: c.nameVi,
        nameEn: c.nameEn,
        items: c.items
          .filter((i) => i.isAvailable)
          .map((i) => ({
            id: i.id,
            nameVi: i.nameVi,
            nameEn: i.nameEn,
            descVi: i.descVi,
            descEn: i.descEn,
            price: i.price,
            imageUrl: i.imageUrl,
            tags: i.tags,
            station: i.station,
            modifierGroups: i.modifierGroups.map((g) => ({
              id: g.id,
              name: g.name,
              required: g.required,
              minSelect: g.minSelect,
              maxSelect: g.maxSelect,
              modifiers: g.modifiers.filter((m) => m.isAvailable).map((m) => ({ id: m.id, name: m.name, priceDelta: m.priceDelta })),
            })),
          })),
      }))
      .filter((c) => c.items.length > 0);
  }

  // ---- Danh mục ----
  createCategory(storeId: string, input: CategoryInput) {
    return this.prisma.category.create({ data: { storeId, ...input } });
  }
  async updateCategory(storeId: string, id: string, input: Partial<CategoryInput>) {
    await this.ensure(this.prisma.category.findFirst({ where: { id, storeId } }));
    return this.prisma.category.update({ where: { id }, data: input });
  }
  async deleteCategory(storeId: string, id: string) {
    await this.ensure(this.prisma.category.findFirst({ where: { id, storeId } }));
    const count = await this.prisma.menuItem.count({ where: { categoryId: id, deletedAt: null } });
    if (count > 0) throw new NotFoundException('Danh mục còn món, hãy chuyển hoặc xóa món trước');
    return this.prisma.category.delete({ where: { id } });
  }

  // ---- Món ----
  async createItem(storeId: string, input: MenuItemInput) {
    await this.ensure(this.prisma.category.findFirst({ where: { id: input.categoryId, storeId } }));
    const { modifierGroups, ...data } = input;
    return this.prisma.menuItem.create({
      data: {
        storeId,
        ...data,
        modifierGroups: {
          create: modifierGroups.map((g, gi) => ({
            storeId,
            name: g.name,
            required: g.required,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            sortOrder: gi,
            modifiers: { create: g.modifiers.map((m, mi) => ({ name: m.name, priceDelta: m.priceDelta, isAvailable: m.isAvailable, sortOrder: mi })) },
          })),
        },
      },
      include: itemInclude,
    });
  }

  /** Cập nhật món: thay toàn bộ nhóm tùy chọn (đơn giản, đủ cho MVP). */
  async updateItem(storeId: string, id: string, input: MenuItemInput) {
    await this.ensure(this.prisma.menuItem.findFirst({ where: { id, storeId, deletedAt: null } }));
    const { modifierGroups, ...data } = input;
    return this.prisma.$transaction(async (tx) => {
      await tx.modifierGroup.deleteMany({ where: { menuItemId: id } });
      return tx.menuItem.update({
        where: { id },
        data: {
          ...data,
          modifierGroups: {
            create: modifierGroups.map((g, gi) => ({
              storeId,
              name: g.name,
              required: g.required,
              minSelect: g.minSelect,
              maxSelect: g.maxSelect,
              sortOrder: gi,
              modifiers: { create: g.modifiers.map((m, mi) => ({ name: m.name, priceDelta: m.priceDelta, isAvailable: m.isAvailable, sortOrder: mi })) },
            })),
          },
        },
        include: itemInclude,
      });
    });
  }

  async deleteItem(storeId: string, id: string) {
    await this.ensure(this.prisma.menuItem.findFirst({ where: { id, storeId } }));
    // Xóa mềm vì dòng đơn cũ còn tham chiếu
    return this.prisma.menuItem.update({ where: { id }, data: { deletedAt: new Date(), isAvailable: false } });
  }

  /** B4: báo hết món. Phát realtime để menu khách ẩn ngay. */
  async setAvailability(storeId: string, id: string, isAvailable: boolean) {
    await this.ensure(this.prisma.menuItem.findFirst({ where: { id, storeId, deletedAt: null } }));
    const item = await this.prisma.menuItem.update({ where: { id }, data: { isAvailable } });
    this.realtime.toStore(storeId, RealtimeEvent.MENU_ITEM_AVAILABILITY, { id, isAvailable });
    // Khách ở mọi phiên đang mở cũng cần biết
    const sessions = await this.prisma.tableSession.findMany({ where: { storeId, status: 'OPEN' }, select: { id: true } });
    for (const s of sessions) this.realtime.toSession(s.id, RealtimeEvent.MENU_ITEM_AVAILABILITY, { id, isAvailable });
    return item;
  }

  private async ensure<T>(p: Promise<T | null>): Promise<T> {
    const v = await p;
    if (!v) throw new NotFoundException('Không tìm thấy');
    return v;
  }
}
