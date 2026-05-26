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
}
