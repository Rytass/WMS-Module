import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';
import { ChangeType, StockStatus } from '@rytass/wms-module-core';
import { GraphQLJSONObject } from '../scalars';

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
  inspectionResult?: boolean;

  /**
   * Whether anyone asked for this batch to be inspected. Paired with
   * `inspectionResult`, it is what separates "awaiting inspection" from
   * "nobody ever intended to inspect this", which `inspectionResult` alone
   * cannot say.
   */
  @Field(() => Boolean, { nullable: true })
  requiresInspection?: boolean;

  /**
   * Batch lineage and the host's own attributes, flattened onto the row the way
   * every other batch column here already is. `batch` resolves to the batch
   * *group*, which is what carries the human-readable key — these two live on
   * the batch itself and would otherwise be unreachable from a stock list.
   */
  @Field(() => ID, { nullable: true })
  parentBatchId?: string | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  attributes?: Record<string, unknown> | null;
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
