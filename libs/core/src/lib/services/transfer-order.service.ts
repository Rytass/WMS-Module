import { Inject, Injectable } from '@nestjs/common';
import {
  TransferOrderEntity,
  TransferOrderEntityClass,
  TransferOrderItemEntity,
  TransferOrderItemEntityClass,
} from '../models';
import { DataSource } from 'typeorm';

@Injectable()
export class TransferOrderService<
  T extends TransferOrderEntityClass = TransferOrderEntityClass,
  K extends TransferOrderItemEntityClass = TransferOrderItemEntityClass,
> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(TransferOrderEntity) readonly transferOrderEntity: T,
    @Inject(TransferOrderItemEntity) readonly transferOrderItemEntity: K,
  ) {}
}
