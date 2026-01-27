import { Inject, Injectable } from '@nestjs/common';
import {
  ReclassifyInventoryOrderEntity,
  ReclassifyInventoryOrderEntityClass,
  ReclassifyInventoryOrderItemEntity,
  ReclassifyInventoryOrderItemEntityClass,
} from '../models';
import { DataSource } from 'typeorm';

@Injectable()
export class ReclassifyInventoryOrderService<
  T extends
    ReclassifyInventoryOrderEntityClass = ReclassifyInventoryOrderEntityClass,
  K extends
    ReclassifyInventoryOrderItemEntityClass = ReclassifyInventoryOrderItemEntityClass,
> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ReclassifyInventoryOrderEntity)
    readonly reclassifyInventoryOrderEntity: T,
    @Inject(ReclassifyInventoryOrderItemEntity)
    readonly reclassifyInventoryOrderItemEntity: K,
  ) {}
}
