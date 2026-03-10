import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { SaleOrderService } from '@wms-module/core';
import { SaleOrderDto } from '../dto';

@Injectable()
export class SaleOrderQuery {
  constructor(private readonly saleOrderService: SaleOrderService) {}

  @Query(() => [String])
  async saleOrderDistinctIds(
    @Args('keyword', { nullable: true }) keyword?: string,
  ): Promise<string[]> {
    const builder = this.saleOrderService.saleOrderRepository
      .createQueryBuilder('so')
      .select('DISTINCT so.id', 'id');

    if (keyword)
      builder.where('so.id LIKE :keyword', {
        keyword: `%${keyword}%`,
      });

    const result = await builder.getRawMany();
    return result.map(({ id }) => id);
  }

  @Query(() => [SaleOrderDto])
  async saleOrders(
    @Args('id', { type: () => [ID] }) id: string,
  ): Promise<SaleOrderDto[]> {
    return this.saleOrderService.saleOrderRepository.findBy({ id });
  }
}
