import { ArgsType, Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateQualityInspectionOrderItemArgs {
  @Field(() => String)
  aggregateKey!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Boolean)
  inspectionResult!: boolean;
}

@ArgsType()
export class CreateQualityInspectionOrderArgs {
  @Field(() => String)
  key!: string;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => [CreateQualityInspectionOrderItemArgs])
  items!: CreateQualityInspectionOrderItemArgs[];
}
