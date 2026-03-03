import {
  ArgsType,
  Field,
  ID,
  Int,
  OmitType,
  PartialType,
} from '@nestjs/graphql';

@ArgsType()
export class CreateLoaderArgs {
  @Field(() => ID)
  typeId!: string;

  @Field(() => ID)
  locationId!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Number, { nullable: true })
  length?: number;

  @Field(() => Number, { nullable: true })
  width?: number;

  @Field(() => Number, { nullable: true })
  height?: number;

  @Field(() => String, { nullable: true })
  sizeUnit?: string;

  @Field(() => Number, { nullable: true })
  volume?: number;

  @Field(() => String, { nullable: true })
  volumeUnit?: string;

  @Field(() => String, { nullable: true })
  note?: string;
}

@ArgsType()
export class UpdateLoaderArgs extends PartialType(
  OmitType(CreateLoaderArgs, ['locationId', 'typeId'] as const),
) {
  @Field(() => ID)
  id!: string;
}
