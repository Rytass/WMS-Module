import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { SaleOrderService } from '@wms-module/core';
import { SaleOrderDto } from '../dto';

@Injectable()
export class SaleOrderQuery {
  constructor(private readonly saleOrderService: SaleOrderService) {}

  @Query(() => [String])
  async saleOrderDistinctIds(): Promise<string[]> {
    return this.saleOrderService.saleOrderRepository
      .query(`SELECT DISTINCT "id" FROM sale_orders ORDER BY "id"`)
      .then((rows) => rows.map((row: { id: string }) => row.id));
  }

  @Query(() => [SaleOrderDto])
  async saleOrders(
    @Args('id', { type: () => [ID] }) id: string,
  ): Promise<SaleOrderDto[]> {
    return this.saleOrderService.saleOrderRepository.findBy({ id });
  }
}
