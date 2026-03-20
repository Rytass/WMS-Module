import { ArgsType, Field, ID, OmitType, PartialType } from '@nestjs/graphql';
import {
  CreateTransferVendorOrderItemArgs,
  UpdateTransferVendorOrderItemArgs,
} from './create-transfer-vendor-order-item.args';

@ArgsType()
export class CreateTransferVendorOrderArgs {
  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  vendorId!: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => [CreateTransferVendorOrderItemArgs])
  items!: CreateTransferVendorOrderItemArgs[];
}

@ArgsType()
export class UpdateTransferVendorOrderArgs extends PartialType(
  OmitType(CreateTransferVendorOrderArgs, ['items']),
) {
  @Field(() => ID)
  id!: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;

  @Field(() => [UpdateTransferVendorOrderItemArgs], { nullable: true })
  items?: UpdateTransferVendorOrderItemArgs[];
}
