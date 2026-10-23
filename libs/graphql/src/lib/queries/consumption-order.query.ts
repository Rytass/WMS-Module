import { Injectable } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ConsumptionOrderService } from '@rytass/wms-module-core';
import {
  ConsumptionOrderDto,
  ConsumptionOrders,
} from '../dto/consumption-order.dto';
import { FindConsumptionOrderArgs } from '../inputs/consumption-order.args';
import { WmsOperation } from '../auth';

@Injectable()
@Resolver()
export class ConsumptionOrderQuery {
  constructor(
    private readonly consumptionOrderService: ConsumptionOrderService,
  ) {}

  @Query(() => ConsumptionOrderDto)
  @WmsOperation({ resource: 'consumption-order', action: 'read' })
  consumptionOrder(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ConsumptionOrderDto> {
    return this.consumptionOrderService.findOne(id);
  }

  @Query(() => ConsumptionOrders)
  @WmsOperation({ resource: 'consumption-order', action: 'read' })
  async consumptionOrders(
    @Args() args: FindConsumptionOrderArgs,
  ): Promise<ConsumptionOrders> {
    const [items, total] = await this.consumptionOrderService.findMany(args);
    return { items, total };
  }
}
