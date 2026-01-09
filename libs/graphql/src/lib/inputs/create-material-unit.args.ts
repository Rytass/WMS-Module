import { Field, ID, InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class CreateMaterialUnitArgs {
  @Field(() => ID)
  materialId!: string;

  @Field(() => String)
  unit!: string;

  @Field(() => Number)
  conversionFactor!: number;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}

@InputType()
export class UpdateMaterialUnitArgs extends PartialType(
  CreateMaterialUnitArgs
) {
  @Field(() => ID, { nullable: true })
  id?: string;
}
