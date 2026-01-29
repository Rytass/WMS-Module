import { ArgsType, Field, ID, OmitType, PartialType } from '@nestjs/graphql';

@ArgsType()
export class CreateLoaderTypeArgs {
  @Field(() => String)
  description!: string;

  @Field(() => String)
  key!: string;
}

@ArgsType()
export class UpdateLoaderTypeArgs extends PartialType(
  OmitType(CreateLoaderTypeArgs, ['key'] as const),
) {
  @Field(() => ID)
  id!: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}
