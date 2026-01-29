import { Inject, Injectable } from '@nestjs/common';
import {
  MergeBatchOrderEntity,
  MergeBatchOrderEntityClass,
  MergeBatchOrderItemEntity,
  MergeBatchOrderItemEntityClass,
} from '../models';
import { DataSource } from 'typeorm';

@Injectable()
export class MergeBatchOrderService<
  T extends MergeBatchOrderEntityClass = MergeBatchOrderEntityClass,
  K extends MergeBatchOrderItemEntityClass = MergeBatchOrderItemEntityClass,
> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(MergeBatchOrderEntity) readonly mergeBatchOrderEntity: T,
    @Inject(MergeBatchOrderItemEntity) readonly mergeBatchOrderItemEntity: K,
  ) {}
}
