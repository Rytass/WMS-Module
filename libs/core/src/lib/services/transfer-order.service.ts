import { Inject, Injectable } from '@nestjs/common';
import {
  TransferOrderEntity,
  TransferOrderEntityClass,
  TransferOrderItemEntity,
  TransferOrderItemEntityClass,
} from '../models';
import { DataSource, EntityManager, EntityTarget } from 'typeorm';
import { StockService } from '@rytass/wms-base-nestjs-module';
import { HelperService } from './helper.service';
import {
  CreateTransferOrderInput,
  UpdateTransferOrderInput,
} from '../typings/create-transfer-order.input';

@Injectable()
export class TransferOrderService<
  T extends TransferOrderEntityClass = TransferOrderEntityClass,
  K extends TransferOrderItemEntityClass = TransferOrderItemEntityClass,
> {
  private readonly seqPrefix = 'TO';
  constructor(
    private readonly dataSource: DataSource,
    private readonly stockService: StockService,
    private readonly helperService: HelperService,
    @Inject(TransferOrderEntity) readonly transferOrderEntity: EntityTarget<T>,
    @Inject(TransferOrderItemEntity)
    readonly transferOrderItemEntity: EntityTarget<K>,
  ) {}

  async createTransferOrder(
    options: CreateTransferOrderInput,
    manager = this.dataSource.manager,
  ): Promise<T> {
    const transferOrderRepository =
      manager.getRepository<TransferOrderEntityClass>(this.transferOrderEntity);
    const transferOrderItemRepository =
      manager.getRepository<TransferOrderItemEntityClass>(
        this.transferOrderItemEntity,
      );

    const key = await this.helperService.getSeq(this.seqPrefix, manager);
    const order = await transferOrderRepository.save(
      transferOrderRepository.create({ key, ...options }),
    );

    if (options.items && options.items.length > 0) {
      const items = options.items.map((item) =>
        transferOrderItemRepository.create({
          ...item,
          orderId: order.id,
        }),
      );
      await transferOrderItemRepository.save(items);
    }
    return order as T;
  }

  async updateTransferOrder({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateTransferOrderInput & { manager?: EntityManager }): Promise<T> {
    const transferOrderRepository =
      manager.getRepository<TransferOrderEntityClass>(this.transferOrderEntity);
    const transferOrderItemRepository =
      manager.getRepository<TransferOrderItemEntityClass>(
        this.transferOrderItemEntity,
      );
    const order = await transferOrderRepository.findOneByOrFail({
      id,
    });
    const updated = await transferOrderRepository.save(
      transferOrderRepository.create({ ...order, ...options }),
    );

    if (options.items?.length) {
      const newItems: Partial<TransferOrderItemEntityClass>[] = [];
      const existingItems: Partial<TransferOrderItemEntityClass>[] = [];

      await transferOrderItemRepository
        .find({ where: { orderId: id } })
        .then((items) => {
          const itemSet = new Set(items.map((i) => i.id));
          options.items?.forEach((item) => {
            if (item.removedAt) return;
            if (!item.id) newItems.push(item);
            else if (itemSet.has(item.id)) existingItems.push(item);
          });
        });

      if (newItems.length)
        await transferOrderItemRepository.save(
          newItems.map((item) =>
            transferOrderItemRepository.create({
              ...item,
              orderId: id,
            }),
          ),
        );

      if (existingItems.length)
        await Promise.all(
          existingItems.map((item) =>
            transferOrderItemRepository.save(
              transferOrderItemRepository.create({ ...item }),
            ),
          ),
        );
    }

    return updated as T;
  }
}
