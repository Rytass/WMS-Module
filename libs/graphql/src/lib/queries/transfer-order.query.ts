import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { TransferOrderService } from '@rytass/wms-module-core';
import { TransferOrderDto, TransferOrders } from '../dto/transfer-order.dto';
import { FindTransferOrderArgs } from '../inputs/find-transfer-order.args';
import { WmsOperation } from '../auth';

@Injectable()
export class TransferOrderQuery {
  constructor(private readonly transferOrderService: TransferOrderService) {}

  @Query(() => TransferOrders)
  @WmsOperation({ resource: 'transfer-order', action: 'read' })
  async transferOrders(
    @Args() args: FindTransferOrderArgs,
  ): Promise<TransferOrders> {
    const [items, total] = await this.transferOrderService.findMany(args);
    return { items, total };
  }

  @Query(() => TransferOrderDto)
  @WmsOperation({ resource: 'transfer-order', action: 'read' })
  async transferOrder(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TransferOrderDto> {
    return this.transferOrderService.transferOrderRepository.findOneByOrFail({
      id,
    });
  }
}
