import { Injectable } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { OrderReferenceService } from '@rytass/wms-module-core';
import { OrderReferences } from '../dto/order-reference.dto';
import { FindOrderReferenceArgs } from '../inputs/order-reference.args';
import { WmsOperation } from '../auth';

@Injectable()
@Resolver()
export class OrderReferenceQuery {
  constructor(private readonly orderReferenceService: OrderReferenceService) {}

  @Query(() => OrderReferences)
  @WmsOperation({ resource: 'order-reference', action: 'read' })
  async orderReferences(
    @Args() args: FindOrderReferenceArgs,
  ): Promise<OrderReferences> {
    const [items, total] = await this.orderReferenceService.findMany(args);
    return { items, total };
  }
}
