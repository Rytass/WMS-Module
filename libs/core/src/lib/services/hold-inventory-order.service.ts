import { Inject, Injectable } from '@nestjs/common';
import {
  HoldInventoryOrderEntity,
  HoldInventoryOrderEntityClass,
  HoldInventoryOrderItemEntity,
  HoldInventoryOrderItemEntityClass,
} from '../models';
import { DataSource } from 'typeorm';

@Injectable()
export class HoldInventoryOrderService<
  T extends HoldInventoryOrderEntityClass = HoldInventoryOrderEntityClass,
  K extends HoldInventoryOrderItemEntityClass = HoldInventoryOrderItemEntityClass,
> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(HoldInventoryOrderEntity) readonly holdInventoryOrderEntity: T,
    @Inject(HoldInventoryOrderItemEntity) readonly holdInventoryOrderItemEntity: K,
  ) {}
}
