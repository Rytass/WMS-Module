import { Field, ID, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';
import { StockStatus } from '@rytass/wms-module-core';

@ArgsType()
export class FindStockArgs extends PaginationArgs {
  @Field(() => ID, { nullable: true })
  materialId?: string;

  @Field(() => ID, { nullable: true })
  batchId?: string;

  @Field(() => ID, { nullable: true })
  locationId?: string;

  /**
   * Locations to leave out of the result. Subtractive counterpart to
   * `locationId`: a stock report uses it to drop locations that do not hold
   * available inventory (staging, quarantine, a host's work-in-progress lane).
   */
  @Field(() => [ID], { nullable: true })
  excludeLocationIds?: string[];

  @Field(() => ID, { nullable: true })
  loaderId?: string;

  @Field(() => [ID], { nullable: true })
  ids?: string[];

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => StockStatus, { nullable: true })
  status?: StockStatus;

  @Field(() => String, { nullable: true })
  materialKey?: string;

  @Field(() => String, { nullable: true })
  batchKey?: string;

  @Field(() => String, { nullable: true })
  locationKey?: string;

  @Field(() => String, { nullable: true })
  loaderKey?: string;

  /**
   * Commercial attributes carried by the stock's batch. Matched exactly — they
   * are identifiers from the host system, and a partial match on 「SO-1」 would
   * quietly sweep in 「SO-10」.
   */
  @Field(() => String, { nullable: true })
  vendorId?: string;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  saleId?: string;

  @Field(() => String, { nullable: true })
  saleSerialId?: string;
}
