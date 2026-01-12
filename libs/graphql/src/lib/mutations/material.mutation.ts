import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { MaterialDto } from '../dto';
import {
  CreateMaterialArgs,
  UpdateMaterialArgs,
} from '../inputs/create-material.args';
import { MaterialService } from '@wms-module/core';

@Injectable()
export class MaterialMutation {
  constructor(private readonly materialService: MaterialService) {}

  @Mutation(() => MaterialDto)
  async createMaterial(@Args() args: CreateMaterialArgs): Promise<MaterialDto> {
    return this.materialService.createMaterial(args);
  }

  @Mutation(() => MaterialDto)
  async updateMaterial(@Args() args: UpdateMaterialArgs): Promise<MaterialDto> {
    return this.materialService.updateMaterial(args);
  }
}
