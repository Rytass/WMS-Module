import { Field, ID, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class QualityInspectionOrderItemDto {
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
  targetInspectedQuantity!: number;
}
