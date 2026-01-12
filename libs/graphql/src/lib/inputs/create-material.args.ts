import { ArgsType, Field, ID, OmitType, PartialType } from '@nestjs/graphql';
import { CreateMaterialUnitArgs } from './create-material-unit.args';

@ArgsType()
export class CreateMaterialArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  baseUnit!: string;

  @Field(() => [CreateMaterialUnitArgs])
  units!: CreateMaterialUnitArgs[];

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}

@ArgsType()
export class UpdateMaterialArgs extends PartialType(
  OmitType(CreateMaterialArgs, ['id', 'baseUnit', 'units'] as const)
) {
  @Field(() => ID)
  id!: string;

  @Field(() => [CreateMaterialUnitArgs], { nullable: true })
  units?: CreateMaterialUnitArgs[];
}
