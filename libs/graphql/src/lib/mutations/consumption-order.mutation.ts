import { Injectable } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ConsumptionOrderService } from '@rytass/wms-module-core';
import { ConsumptionOrderDto } from '../dto/consumption-order.dto';
import {
  ConsumptionOrderActionArgs,
  CreateConsumptionOrderArgs,
  UpdateConsumptionOrderArgs,
} from '../inputs/consumption-order.args';
import { WmsOperation } from '../auth';
import { WmsMutationEvent } from '../events';

/**
 * The three actions are separate mutations rather than one with a mode
 * argument: they carry different permissions (a host may well let the floor
 * issue and return but not settle) and different events, and both of those are
 * keyed per field.
 */
@Injectable()
@Resolver()
export class ConsumptionOrderMutation {
  constructor(
    private readonly consumptionOrderService: ConsumptionOrderService,
  ) {}

  @Mutation(() => ConsumptionOrderDto)
  @WmsOperation({ resource: 'consumption-order', action: 'create' })
  @WmsMutationEvent({ event: 'consumption-order.created' })
  createConsumptionOrder(
    @Args() args: CreateConsumptionOrderArgs,
  ): Promise<ConsumptionOrderDto> {
    return this.consumptionOrderService.createConsumptionOrder(args);
  }

  @Mutation(() => ConsumptionOrderDto)
  @WmsOperation({ resource: 'consumption-order', action: 'update' })
  @WmsMutationEvent({ event: 'consumption-order.updated' })
  updateConsumptionOrder(
    @Args() args: UpdateConsumptionOrderArgs,
  ): Promise<ConsumptionOrderDto> {
    return this.consumptionOrderService.updateConsumptionOrder(args);
  }

  @Mutation(() => Boolean)
  @WmsOperation({ resource: 'consumption-order', action: 'issue' })
  @WmsMutationEvent({ event: 'consumption-order.issued' })
  issueConsumptionOrder(
    @Args() args: ConsumptionOrderActionArgs,
  ): Promise<boolean> {
    return this.consumptionOrderService.issue(args);
  }

  @Mutation(() => Boolean)
  @WmsOperation({ resource: 'consumption-order', action: 'return' })
  @WmsMutationEvent({ event: 'consumption-order.returned' })
  returnConsumptionOrder(
    @Args() args: ConsumptionOrderActionArgs,
  ): Promise<boolean> {
    return this.consumptionOrderService.return(args);
  }

  @Mutation(() => Boolean)
  @WmsOperation({ resource: 'consumption-order', action: 'settle' })
  @WmsMutationEvent({ event: 'consumption-order.settled' })
  settleConsumptionOrder(
    @Args() args: ConsumptionOrderActionArgs,
  ): Promise<boolean> {
    return this.consumptionOrderService.settle(args);
  }
}
