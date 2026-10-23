import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { MaterialDto } from '../dto';
import {
  CreateMaterialArgs,
  UpdateMaterialArgs,
} from '../inputs/create-material.args';
import { MaterialService } from '@rytass/wms-module-core';
import { WmsOperation } from '../auth';
import { WmsMutationEvent } from '../events';

@Injectable()
export class MaterialMutation {
  constructor(private readonly materialService: MaterialService) {}

  @Mutation(() => MaterialDto)
  @WmsOperation({ resource: 'material', action: 'create' })
  @WmsMutationEvent({ event: 'material.created' })
  async createMaterial(@Args() args: CreateMaterialArgs): Promise<MaterialDto> {
    return this.materialService.createMaterial(args);
  }

  @Mutation(() => MaterialDto)
  @WmsOperation({ resource: 'material', action: 'update' })
  @WmsMutationEvent({ event: 'material.updated' })
  async updateMaterial(@Args() args: UpdateMaterialArgs): Promise<MaterialDto> {
    return this.materialService.updateMaterial(args);
  }
}
