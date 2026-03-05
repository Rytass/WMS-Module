import { Field, InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class CreateShipInventoryOrderReferenceArgs {
  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  unitId?: string;

  @Field(() => String, { nullable: true })
  batchKey?: string;

  @Field(() => String)
  materialKey!: string;

  @Field(() => Number)
  targetShippedQuantity!: number;

  @Field(() => Number)
  serialId!: number;
}

@InputType()
export class UpdateShipInventoryOrderReferenceArgs extends PartialType(
  CreateShipInventoryOrderReferenceArgs,
) {
  @Field(() => String)
  id!: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;
}
