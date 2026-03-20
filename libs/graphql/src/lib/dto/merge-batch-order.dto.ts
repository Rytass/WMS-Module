import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MergeBatchOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  locationId!: string;

  @Field(() => String, { nullable: true })
  loaderId?: string | null;

  @Field(() => Number)
  targetMergedQuantity!: number;
}

@ObjectType()
export class MergeBatchOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => Date)
  createdAt!: Date;
}
