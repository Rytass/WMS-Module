import { Inject, Injectable } from '@nestjs/common';
import {
  SplitBatchOrderEntity,
  SplitBatchOrderEntityClass,
  SplitBatchOrderItemEntity,
  SplitBatchOrderItemEntityClass,
} from '../models';
import { DataSource } from 'typeorm';

@Injectable()
export class SplitBatchOrderService<
  T extends SplitBatchOrderEntityClass = SplitBatchOrderEntityClass,
  K extends SplitBatchOrderItemEntityClass = SplitBatchOrderItemEntityClass,
> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(SplitBatchOrderEntity) readonly splitBatchOrderEntity: T,
    @Inject(SplitBatchOrderItemEntity) readonly splitBatchOrderItemEntity: K,
  ) {}
}
