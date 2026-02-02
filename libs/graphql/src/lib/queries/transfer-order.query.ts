import { Injectable } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';
import { TransferOrderService } from '@wms-module/core';
import { TransferOrders } from '../dto/transfer-order';
import { FindTransferOrderArgs } from '../inputs/find-transfer-order.args';

@Injectable()
export class TransferOrderQuery {
  constructor(private readonly transferOrderService: TransferOrderService) {}

  @Query(() => TransferOrders)
  async transferOrders(
    @Args() args: FindTransferOrderArgs,
  ): Promise<TransferOrders> {
    const [items, total] = await this.transferOrderService.findMany(args);
    return { items, total };
  }
}
