import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ReclassifyInventoryOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  locationId?: string | null;

  @Field(() => String, { nullable: true })
  loaderId?: string | null;

  @Field(() => Number)
  targetReclassifiedQuantity!: number;
}

@ObjectType()
export class ReclassifyInventoryOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => [ReclassifyInventoryOrderItemDto])
  items!: ReclassifyInventoryOrderItemDto[];
}
