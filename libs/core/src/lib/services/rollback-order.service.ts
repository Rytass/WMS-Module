import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { StockEntityClass } from '../models/metadata/stock.entity';
import {
  RollbackOrderEntity,
  RollbackOrderEntityClass,
} from '../models/extensions/rollback-order/rollback-order.entity';
import {
  RollbackOrderItemEntity,
  RollbackOrderItemEntityClass,
} from '../models/extensions/rollback-order/rollback-order-item.entity';
import { ReceiveInventoryOrderChangeEntityClass } from '../models/extensions/receive-inventory-order/receive-inventory-order-change.entity';
import { ShipInventoryOrderChangeEntityClass } from '../models/extensions/ship-inventory-order/ship-inventory-order-change.entity';
import { TransferOrderChangeEntityClass } from '../models/extensions/transfer-order/transfer-order-change.entity';
import { HoldInventoryOrderChangeEntityClass } from '../models/extensions/hold-inventory-order/hold-inventory-order-change.entity';
import { AllocateInventoryOrderChangeEntityClass } from '../models/extensions/allocate-inventory-order/allocate-inventory-order-change.entity';
import { SplitBatchOrderChangeEntityClass } from '../models/extensions/split-batch-order/split-batch-order-change.entity';
import { MergeBatchOrderChangeEntityClass } from '../models/extensions/merge-batch-order/merge-batch-order-change.entity';
import { ReclassifyInventoryOrderChangeEntityClass } from '../models/extensions/reclassify-inventory-order/reclassify-inventory-order-change.entity';
import { TransferCustomerOrderChangeEntityClass } from '../models/extensions/transfer-customer-order/transfer-customer-order-change.entity';
import { TransferVendorOrderChangeEntityClass } from '../models/extensions/transfer-vendor-order/transfer-vendor-order-change.entity';
import { QualityInspectionOrderChangeEntityClass } from '../models/extensions/quality-inspection-order/quality-inspection-order-change.entity';
import { ScrapeOrderChangeEntityClass } from '../models/extensions/scrape-order/scrape-order-change.entity';
import { StockService } from './stock.service';

export interface CreateRollbackOrderInput {
  key?: string;
  description?: string;
  reason?: string;
  createdBy?: string;
  targets: { targetOrderId: string }[];
  manager?: EntityManager;
}

export interface FindRollbackOrderInput {
  id?: string;
  targetOrderId?: string;
  offset?: number;
  limit?: number;
}

interface ChangeRow {
  id: string;
  itemId: string;
  quantityChanged: number;
}

/**
 * 沖銷單服務 — 對「已完成事件」做機械反轉（mechanical inversion）。
 *
 * <h3>模型前提（本模組的事件本體論）</h3>
 * 每次操作（receive 執行、ship prepare、ship 執行、cancelShip、transfer …）都會：
 * 建一列匿名 orders（事件 id）→ 寫一列該類別的 change（change.id = 事件 id）→
 * 寫若干列 stocks（stocks.orderId = 事件 id）。因此「事件」的完整效果 =
 * 以事件 id 為鍵的 change + stocks 列集合。
 *
 * <h3>沖銷 = 反號重放</h3>
 * 對目標事件：新建一列反向事件 orders → 在同一張 change 表寫
 * quantityChanged 取負的 change（維持既有 Σ(+)/Σ|−| 數學不變）→ 逐列寫
 * quantity 取負的 stocks。原事件所有資料列不修改、不刪除。
 * 反轉可組合：沖銷 ship 執行事件 + 沖銷 ship prepare 事件 = 貨完整回到
 * 原批次 FREE（帳面淨效果與從未出過等價）。
 *
 * <h3>守門</h3>
 * <ul>
 * <li>反向後會「移出庫存」的每一個 bucket（原事件為正的列）先驗可用量 —
 *     下游已消費（已出貨/占用）的事件擋下。</li>
 * <li>一顆事件最多被沖銷一次（rollback_order_items.targetOrderId UNIQUE，
 *     DB 層 race-safe）。</li>
 * <li>沖銷單自身的事件與沖銷文件不可再被沖銷（rollback of rollback 禁止；
 *     要恢復原狀請開新的正向單）。</li>
 * </ul>
 *
 * <h3>不做的事</h3>
 * 不改單據 status、不軟刪原單（單據 status 由 changes 動態推導，receive 側
 * 沖銷後 Σ 自動回落）。SAP 沖銷（ZMM005）非本模組職責，由外部消費端以
 * targetKind + 事件對象自行對映。
 */
@Injectable()
export class RollbackOrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly stockService: StockService,
    @Inject(RollbackOrderEntity)
    private readonly rollbackOrderEntity: new () => RollbackOrderEntityClass,
    @Inject(RollbackOrderItemEntity)
    private readonly rollbackOrderItemEntity: new () => RollbackOrderItemEntityClass,
  ) {}

  /** 各單據類別的 change entity（機械反轉時逐一以事件 id 查找歸屬）。 */
  private static readonly CHANGE_KINDS: {
    kind: string;
    entity: new () => object;
  }[] = [
    {
      kind: 'ReceiveInventoryOrder',
      entity: ReceiveInventoryOrderChangeEntityClass,
    },
    { kind: 'ShipInventoryOrder', entity: ShipInventoryOrderChangeEntityClass },
    { kind: 'TransferOrder', entity: TransferOrderChangeEntityClass },
    { kind: 'HoldInventoryOrder', entity: HoldInventoryOrderChangeEntityClass },
    {
      kind: 'AllocateInventoryOrder',
      entity: AllocateInventoryOrderChangeEntityClass,
    },
    { kind: 'SplitBatchOrder', entity: SplitBatchOrderChangeEntityClass },
    { kind: 'MergeBatchOrder', entity: MergeBatchOrderChangeEntityClass },
    {
      kind: 'ReclassifyInventoryOrder',
      entity: ReclassifyInventoryOrderChangeEntityClass,
    },
    {
      kind: 'TransferCustomerOrder',
      entity: TransferCustomerOrderChangeEntityClass,
    },
    {
      kind: 'TransferVendorOrder',
      entity: TransferVendorOrderChangeEntityClass,
    },
    {
      kind: 'QualityInspectionOrder',
      entity: QualityInspectionOrderChangeEntityClass,
    },
    { kind: 'ScrapeOrder', entity: ScrapeOrderChangeEntityClass },
  ];

  async createRollbackOrder(
    options: CreateRollbackOrderInput,
  ): Promise<RollbackOrderEntityClass> {
    const run = async (manager: EntityManager) => {
      const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
      const rollbackRepository =
        manager.getRepository<RollbackOrderEntityClass>(
          this.rollbackOrderEntity,
        );

      if (!options.targets?.length) {
        throw new Error('Rollback targets cannot be empty');
      }
      const targetIds = options.targets.map((t) => t.targetOrderId);
      if (new Set(targetIds).size !== targetIds.length) {
        throw new Error('Duplicate rollback targets in one request');
      }

      // 建立沖銷單據（單據 id 註冊進 orders registry，與其他 kind 同構）
      const { id: rollbackOrderId } = await orderRepository.save(
        orderRepository.create(),
      );
      await rollbackRepository.save(
        rollbackRepository.create({
          id: rollbackOrderId,
          key: options.key ?? `RB-${randomUUID()}`,
          description: options.description ?? '',
          reason: options.reason ?? null,
          createdBy: options.createdBy ?? null,
        }),
      );

      for (const targetOrderId of targetIds) {
        await this.rollbackOneEvent(targetOrderId, rollbackOrderId, manager);
      }

      return rollbackRepository.findOneOrFail({
        where: { id: rollbackOrderId },
        relations: ['items'],
      });
    };

    if (options.manager) return run(options.manager);
    return this.dataSource.transaction(run);
  }

  private async rollbackOneEvent(
    targetOrderId: string,
    rollbackOrderId: string,
    manager: EntityManager,
  ): Promise<void> {
    const orderRepository = manager.getRepository<OrderEntity>(OrderEntity);
    const stockRepository =
      manager.getRepository<StockEntityClass>(StockEntityClass);
    const rollbackRepository = manager.getRepository<RollbackOrderEntityClass>(
      this.rollbackOrderEntity,
    );
    const rollbackItemRepository =
      manager.getRepository<RollbackOrderItemEntityClass>(
        this.rollbackOrderItemEntity,
      );

    // 目標存在性
    const target = await orderRepository.findOne({
      where: { id: targetOrderId },
    });
    if (!target) {
      throw new Error(`Rollback target not found: ${targetOrderId}`);
    }

    // 禁止 rollback of rollback
    if (await rollbackRepository.findOne({ where: { id: targetOrderId } })) {
      throw new Error(
        `Rollback target is a rollback order document: ${targetOrderId}`,
      );
    }
    if (
      await rollbackItemRepository.findOne({
        where: { reverseOrderId: targetOrderId },
      })
    ) {
      throw new Error(
        `Rollback target is a reverse event of another rollback: ${targetOrderId}`,
      );
    }

    // 防雙重沖銷（UNIQUE 為 race-safe 後盾）
    if (await rollbackItemRepository.findOne({ where: { targetOrderId } })) {
      throw new Error(`Target already rolled back: ${targetOrderId}`);
    }

    // 蒐集事件效果
    const stocks = await stockRepository.find({
      where: { orderId: targetOrderId },
    });

    let change: ChangeRow | null = null;
    let targetKind: string | null = null;
    let changeEntity: (new () => object) | null = null;
    for (const candidate of RollbackOrderService.CHANGE_KINDS) {
      const found = (await manager
        .getRepository(candidate.entity)
        .findOne({ where: { id: targetOrderId } })) as ChangeRow | null;
      if (found) {
        change = found;
        targetKind = candidate.kind;
        changeEntity = candidate.entity;
        break;
      }
    }

    if (!stocks.length && !change) {
      throw new Error(
        `Target has no ledger effect to invert (a document id, not an event?): ${targetOrderId}`,
      );
    }

    // 可用量守門：反向後會移出庫存的 bucket（原事件為正的列）
    for (const stock of stocks) {
      const quantity = Number(stock.quantity);
      if (quantity > 0) {
        await this.stockService.validateStockAvailability(
          {
            materialId: stock.materialId,
            batchId: stock.batchId,
            locationId: stock.locationId,
            loaderId: stock.loaderId,
            quantity,
          },
          manager,
        );
      }
    }

    // 反向事件
    const { id: reverseOrderId } = await orderRepository.save(
      orderRepository.create(),
    );

    if (change && changeEntity) {
      const changeRepository = manager.getRepository(changeEntity);
      await changeRepository.save(
        changeRepository.create({
          id: reverseOrderId,
          itemId: change.itemId,
          quantityChanged: -1 * Number(change.quantityChanged),
        }),
      );
    }

    if (stocks.length) {
      await stockRepository.save(
        stockRepository.create(
          stocks.map((stock) => ({
            orderId: reverseOrderId,
            materialId: stock.materialId,
            batchId: stock.batchId,
            locationId: stock.locationId,
            loaderId: stock.loaderId,
            quantity: -1 * Number(stock.quantity),
          })),
        ),
      );
    }

    await rollbackItemRepository.save(
      rollbackItemRepository.create({
        orderId: rollbackOrderId,
        targetOrderId,
        reverseOrderId,
        targetKind,
      }),
    );
  }

  async findMany(
    options: FindRollbackOrderInput,
  ): Promise<[RollbackOrderEntityClass[], number]> {
    const repository = this.dataSource.getRepository<RollbackOrderEntityClass>(
      this.rollbackOrderEntity,
    );
    const queryBuilder = repository
      .createQueryBuilder('orders')
      .leftJoinAndSelect('orders.items', 'items')
      .orderBy('orders.createdAt', 'DESC');

    if (options.id) {
      queryBuilder.andWhere('orders.id = :id', { id: options.id });
    }
    if (options.targetOrderId) {
      queryBuilder.andWhere(
        `orders.id IN (SELECT i."orderId" FROM rollback_order_items i WHERE i."targetOrderId" = :targetOrderId)`,
        { targetOrderId: options.targetOrderId },
      );
    }
    if (options.limit != null) queryBuilder.take(options.limit);
    if (options.offset != null) queryBuilder.skip(options.offset);

    return queryBuilder.getManyAndCount();
  }
}
