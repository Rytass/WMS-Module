import { Inject, Injectable } from '@nestjs/common';
import {
  TransferCustomerOrderEntity,
  TransferCustomerOrderEntityClass,
  TransferCustomerOrderItemEntity,
  TransferCustomerOrderItemEntityClass,
} from '../models';
import { DataSource } from 'typeorm';

@Injectable()
export class TransferCustomerOrderService<
  T extends TransferCustomerOrderEntityClass = TransferCustomerOrderEntityClass,
  K extends
    TransferCustomerOrderItemEntityClass = TransferCustomerOrderItemEntityClass,
> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(TransferCustomerOrderEntity)
    readonly transferCustomerOrderEntity: T,
    @Inject(TransferCustomerOrderItemEntity)
    readonly transferCustomerOrderItemEntity: K,
  ) {}
}
