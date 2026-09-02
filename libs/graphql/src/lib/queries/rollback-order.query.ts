import { Injectable } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';
import { RollbackOrderService } from '@rytass/wms-module-core';
import { RollbackOrderDto, RollbackOrders } from '../dto/rollback-order.dto';
import { FindRollbackOrderArgs } from '../inputs/create-rollback-order.args';

@Injectable()
export class RollbackOrderQuery {
  constructor(private readonly rollbackOrderService: RollbackOrderService) {}

  @Query(() => RollbackOrders)
  async rollbackOrders(
    @Args() args: FindRollbackOrderArgs,
  ): Promise<RollbackOrders> {
    const [items, total] = await this.rollbackOrderService.findMany(args);
    return { items, total } as RollbackOrders;
  }

  @Query(() => RollbackOrderDto, { nullable: true })
  async rollbackOrder(
    @Args() args: FindRollbackOrderArgs,
  ): Promise<RollbackOrderDto | null> {
    const [items] = await this.rollbackOrderService.findMany({
      id: args.id,
      limit: 1,
    });
    return (items[0] as RollbackOrderDto | undefined) ?? null;
  }
}
