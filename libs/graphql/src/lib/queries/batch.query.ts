import { Injectable } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';
import { Batches } from '../dto/batch.dto';
import { BatchService } from '@wms-module/core';
import { FindBatchArgs } from '../inputs/find-batch.args';

@Injectable()
export class BatchQuery {
  constructor(private readonly batchService: BatchService) {}
  @Query(() => Batches)
  async batches(@Args() args: FindBatchArgs): Promise<Batches> {
    const [items, total] = await this.batchService.findMany({
      ...args,
      wildcard: args.key ? { key: 'key', value: args.key } : undefined,
    });
    return { items, total };
  }
}
