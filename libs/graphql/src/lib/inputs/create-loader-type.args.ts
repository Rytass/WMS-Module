import { ArgsType, Field, ID, OmitType, PartialType } from '@nestjs/graphql';

@ArgsType()
export class CreateLoaderTypeArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  serial!: string;
}

@ArgsType()
export class UpdateLoaderTypeArgs extends PartialType(
  OmitType(CreateLoaderTypeArgs, ['id', 'serial'] as const)
) {
  @Field(() => ID)
  id!: string;
}
