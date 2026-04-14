import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { TransferOrderService } from '@wms-module/core';
import { TransferOrderDto, TransferOrders } from '../dto/transfer-order.dto';
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

  @Query(() => TransferOrderDto)
  async transferOrder(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TransferOrderDto> {
    return this.transferOrderService.transferOrderRepository.findOneByOrFail({
      id,
    });
  }
}
