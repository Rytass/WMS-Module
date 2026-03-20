import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SplitBatchOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  locationId?: string | null;

  @Field(() => String, { nullable: true })
  loaderId?: string | null;

  @Field(() => Number)
  targetSplitQuantity!: number;
}

@ObjectType()
export class SplitBatchOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => Date)
  createdAt!: Date;
}
