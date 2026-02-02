import { ArgsType, Field, ID, OmitType, PartialType } from '@nestjs/graphql';
import {
  CreateTransferOrderItemArgs,
  UpdateTransferOrderItemArgs,
} from './create-transfer-order-item.args';

@ArgsType()
export class CreateTransferOrderArgs {
  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => ID)
  locationId!: string;

  @Field(() => ID, { nullable: true })
  loaderId?: string;

  @Field(() => String, { nullable: true })
  receiver?: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => [CreateTransferOrderItemArgs])
  items!: CreateTransferOrderItemArgs[];
}

@ArgsType()
export class UpdateTransferOrderArgs extends PartialType(
  OmitType(CreateTransferOrderArgs, ['items']),
) {
  @Field(() => ID)
  id!: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;

  @Field(() => [UpdateTransferOrderItemArgs], { nullable: true })
  items?: UpdateTransferOrderItemArgs[];
}
