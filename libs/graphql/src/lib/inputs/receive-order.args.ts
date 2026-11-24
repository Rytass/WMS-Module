import { Field, InputType, Float } from '@nestjs/graphql';

@InputType()
export class ReceiveOrderArgs {
  @Field(() => String)
  itemId!: string;

  @Field(() => String, { nullable: true })
  batchKey?: string;

  @Field(() => String, { nullable: true })
  locationKey?: string;

  @Field(() => String, { nullable: true })
  loaderKey?: string;

  @Field(() => Float)
  quantity!: number;

  @Field(() => Boolean, { nullable: true })
  inspectionResult?: boolean;
}
