import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { MaterialDto, Materials } from '../dto';
import { MaterialService } from '@wms-module/core';
import { FindMaterialArgs } from '../inputs/find-material.args';

@Injectable()
export class MaterialQuery {
  constructor(private readonly materialService: MaterialService) {}
  @Query(() => MaterialDto)
  material(@Args('id', { type: () => ID }) id: string): Promise<MaterialDto> {
    return this.materialService.materialRepository.findOneByOrFail({ id });
  }

  @Query(() => Materials)
  async materials(@Args() args: FindMaterialArgs): Promise<Materials> {
    const [items, total] = await this.materialService.findMany(args);
    return { items, total };
  }
}
