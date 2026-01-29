import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';
import { StockStatus } from '@wms-module/core';

@ObjectType()
export class StockDto {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  loaderId!: string;
}

@ObjectType()
export class Stocks extends PaginatedResponse(StockDto) {}

@ObjectType()
export class AggregatedStockDto {
  @Field(() => Int)
  quantity!: number;

  @Field(() => StockStatus)
  status!: StockStatus;

  @Field(() => ID)
  materialId!: string;

  @Field(() => ID)
  batchId!: string;

  @Field(() => ID)
  locationId!: string;

  @Field(() => ID)
  loaderId!: string;
}

registerEnumType(StockStatus, {
  name: 'StockStatus',
  description: 'The status of the stock',
});

@ObjectType()
export class AggregatedStocks extends PaginatedResponse(AggregatedStockDto) {}
