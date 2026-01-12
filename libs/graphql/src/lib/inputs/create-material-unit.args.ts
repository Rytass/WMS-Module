import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateMaterialUnitArgs {
  @Field(() => String)
  unit!: string;

  @Field(() => Number)
  conversionFactor!: number;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}
