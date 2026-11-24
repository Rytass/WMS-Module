import { Field, ID, Float, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ScrapeOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  materialId!: string;

  @Field(() => ID)
  batchId!: string;

  @Field(() => ID, { nullable: true })
  locationId!: string | null;

  @Field(() => ID, { nullable: true })
  loaderId!: string | null;

  @Field(() => ID)
  orderId!: string;

  @Field(() => ID, { nullable: true })
  unitId!: string | null;

  @Field(() => Float)
  targetScrapedQuantity!: number;
}

@ObjectType()
export class ScrapeOrderItems extends PaginatedResponse(ScrapeOrderItemDto) {}
