import { Inject, Injectable } from '@nestjs/common';
import {
  AllocateInventoryOrderEntity,
  AllocateInventoryOrderEntityClass,
  AllocateInventoryOrderItemEntity,
  AllocateInventoryOrderItemEntityClass,
} from '../models';
import { DataSource } from 'typeorm';

@Injectable()
export class AllocateInventoryOrderService<
  T extends
    AllocateInventoryOrderEntityClass = AllocateInventoryOrderEntityClass,
  K extends
    AllocateInventoryOrderItemEntityClass = AllocateInventoryOrderItemEntityClass,
> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(AllocateInventoryOrderEntity)
    readonly allocateInventoryOrderEntity: T,
    @Inject(AllocateInventoryOrderItemEntity)
    readonly allocateInventoryOrderItemEntity: K,
  ) {}
}
