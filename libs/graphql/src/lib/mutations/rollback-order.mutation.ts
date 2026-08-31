import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { RollbackOrderService } from '@rytass/wms-module-core';
import { RollbackOrderDto } from '../dto/rollback-order.dto';
import { CreateRollbackOrderArgs } from '../inputs/create-rollback-order.args';

@Injectable()
export class RollbackOrderMutation {
  constructor(private readonly rollbackOrderService: RollbackOrderService) {}

  @Mutation(() => RollbackOrderDto)
  async createRollbackOrder(
    @Args() args: CreateRollbackOrderArgs,
  ): Promise<RollbackOrderDto> {
    return this.rollbackOrderService.createRollbackOrder(
      args,
    ) as Promise<RollbackOrderDto>;
  }
}
