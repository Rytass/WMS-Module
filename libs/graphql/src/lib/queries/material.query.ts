import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { MaterialDto, Materials } from '../dto';
import { MaterialService } from '@rytass/wms-module-core';
import { FindMaterialArgs } from '../inputs/find-material.args';
import { WmsOperation } from '../auth';

@Injectable()
export class MaterialQuery {
  constructor(private readonly materialService: MaterialService) {}
  @Query(() => MaterialDto)
  @WmsOperation({ resource: 'material', action: 'read' })
  material(
    @Args('id', { type: () => ID, nullable: true }) id?: string,
    @Args('key', { type: () => String, nullable: true }) key?: string,
  ): Promise<MaterialDto> {
    const where = id ? { id } : key ? { key } : undefined;
    if (!where) {
      throw new Error('Either id or key must be provided');
    }
    return this.materialService.materialRepository.findOneByOrFail(where);
  }

  @Query(() => Materials)
  @WmsOperation({ resource: 'material', action: 'read' })
  async materials(@Args() args: FindMaterialArgs): Promise<Materials> {
    const [items, total] = await this.materialService.findMany({
      ...args,
      wildcard: args.key ? { key: 'key', value: args.key } : undefined,
    });
    return { items, total };
  }
}
