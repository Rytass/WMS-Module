import { Inject, Injectable } from '@nestjs/common';
import {
  TransferVendorOrderEntity,
  TransferVendorOrderEntityClass,
  TransferVendorOrderItemEntity,
  TransferVendorOrderItemEntityClass,
} from '../models';
import { DataSource } from 'typeorm';

@Injectable()
export class TransferVendorOrderService<
  T extends TransferVendorOrderEntityClass = TransferVendorOrderEntityClass,
  K extends
    TransferVendorOrderItemEntityClass = TransferVendorOrderItemEntityClass,
> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(TransferVendorOrderEntity) readonly transferVendorOrderEntity: T,
    @Inject(TransferVendorOrderItemEntity)
    readonly transferVendorOrderItemEntity: K,
  ) {}
}
