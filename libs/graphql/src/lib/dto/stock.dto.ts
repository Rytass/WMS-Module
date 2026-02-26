import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';
import { StockStatus } from '@wms-module/core';

@ObjectType()
export class StockDto {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  loaderId!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => StockStatus)
  status!: StockStatus;
}

@ObjectType()
export class Stocks extends PaginatedResponse(StockDto) {}

@ObjectType()
export class AggregatedStockDto {
  @Field(() => Int)
  quantity!: number;

  @Field(() => StockStatus)
  status!: StockStatus;

  materialId!: string;
  batchId!: string;
  locationId!: string;
  loaderId!: string;
}

registerEnumType(StockStatus, {
  name: 'StockStatus',
  description: 'The status of the stock',
});

@ObjectType()
export class AggregatedStocks extends PaginatedResponse(AggregatedStockDto) {}

@ObjectType()
export class ChangeLogDto {
  @Field(() => Int)
  quantity!: number;

  @Field(() => StockStatus)
  status!: StockStatus;

  materialId!: string;
  batchId!: string;
  locationId!: string;
  loaderId!: string;

  @Field(() => ID)
  id!: string;
}

@ObjectType()
export class ChangeLogs extends PaginatedResponse(ChangeLogDto) {}
