import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';
import { ChangeType, StockStatus } from '@wms-module/core';

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

  @Field(() => ID, { nullable: true })
  transferId?: string | null;

  @Field(() => Boolean, { nullable: true })
  held?: boolean;

  @Field(() => Boolean, { nullable: true })
  inShipment?: boolean;

  @Field(() => ID, { nullable: true })
  saleId?: string | null;

  @Field(() => ID, { nullable: true })
  saleSerialId?: string | null;

  @Field(() => ID, { nullable: true })
  customerId?: string | null;

  @Field(() => ID, { nullable: true })
  vendorId?: string | null;

  @Field(() => Boolean, { nullable: true })
  isInspection?: boolean;
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

  @Field(() => ChangeType)
  changeType!: ChangeType;

  materialId!: string;
  batchId!: string;
  locationId!: string;
  loaderId!: string;

  @Field(() => ID)
  id!: string;
}

registerEnumType(ChangeType, {
  name: 'ChangeType',
  description: 'The type of change that occurred to the stock',
});

@ObjectType()
export class ChangeLogs extends PaginatedResponse(ChangeLogDto) {}
