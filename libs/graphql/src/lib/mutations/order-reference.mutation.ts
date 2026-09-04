import { Injectable } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { OrderReferenceService } from '@rytass/wms-module-core';
import { OrderReferenceDto } from '../dto/order-reference.dto';
import { AttachOrderReferencesArgs } from '../inputs/order-reference.args';
import { WmsOperation } from '../auth';
import { WmsMutationEvent } from '../events';

@Injectable()
@Resolver()
export class OrderReferenceMutation {
  constructor(private readonly orderReferenceService: OrderReferenceService) {}

  /**
   * Additive: attaching twice leaves both sets in place. Detach the ones that
   * no longer apply rather than expecting this to replace them.
   */
  @Mutation(() => [OrderReferenceDto])
  @WmsOperation({ resource: 'order-reference', action: 'attach' })
  @WmsMutationEvent({ event: 'order-reference.attached' })
  attachOrderReferences(
    @Args() args: AttachOrderReferencesArgs,
  ): Promise<OrderReferenceDto[]> {
    return this.orderReferenceService.attach({
      orderType: args.orderType,
      orderId: args.orderId,
      references: args.references,
    });
  }

  @Mutation(() => Boolean)
  @WmsOperation({ resource: 'order-reference', action: 'detach' })
  @WmsMutationEvent({ event: 'order-reference.detached' })
  async detachOrderReference(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    await this.orderReferenceService.detach(id);
    return true;
  }
}
