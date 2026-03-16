import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { SaleOrderService } from '@wms-module/core';
import { FindSaleOrderArgs } from '../inputs/find-sale-order.args';

@Injectable()
export class SaleOrderQuery {
  constructor(private readonly saleOrderService: SaleOrderService) {}

  @Query(() => [String])
  async saleOrderDistinctIds(
    @Args() args?: FindSaleOrderArgs,
  ): Promise<string[]> {
    const builder = this.saleOrderService.saleOrderRepository
      .createQueryBuilder('so')
      .select('DISTINCT so.id', 'id');

    if (args?.key)
      builder.where('so.id LIKE :key', {
        key: `%${args.key}%`,
      });

    if (args?.offset !== undefined && args.offset >= 0)
      builder.skip(args.offset);

    if (args?.limit !== undefined && args.limit > 0) builder.take(args.limit);

    const result = await builder.getRawMany();
    return result.map(({ id }) => id);
  }

  @Query(() => [String])
  async saleOrders(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<string[]> {
    const result = await this.saleOrderService.saleOrderRepository.findBy({
      id,
    });
    return result.map(({ serialId }) => serialId);
  }
}
