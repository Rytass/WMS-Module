import { Injectable } from '@nestjs/common';
import { LoaderService } from '@rytass/wms-module-core';
import { LoaderDto, LoaderTypeDto } from '../dto';
import { Args, Mutation } from '@nestjs/graphql';
import {
  CreateLoaderTypeArgs,
  UpdateLoaderTypeArgs,
} from '../inputs/create-loader-type.args';
import {
  CreateLoaderArgs,
  CreateLoadersArgs,
  UpdateLoaderArgs,
} from '../inputs/create-loader.args';
import { In } from 'typeorm';
import { WmsOperation } from '../auth';
import { WmsMutationEvent } from '../events';
@Injectable()
export class LoaderMutation {
  constructor(private readonly loaderService: LoaderService) {}

  @Mutation(() => [LoaderDto])
  @WmsOperation({ resource: 'loader', action: 'create' })
  @WmsMutationEvent({ event: 'loader.created' })
  async createLoader(@Args() args: CreateLoaderArgs): Promise<LoaderDto[]> {
    return this.loaderService.createLoader(args);
  }

  @Mutation(() => [LoaderDto])
  @WmsOperation({ resource: 'loader', action: 'create' })
  @WmsMutationEvent({ event: 'loader.batch-created' })
  async createBatchLoader(
    @Args('items', { type: () => [CreateLoadersArgs] })
    args: CreateLoadersArgs[],
  ): Promise<LoaderDto[]> {
    const types = await this.loaderService.loaderTypeRepository.find({
      where: {
        key: In(args.map((arg) => arg.typeKey)),
      },
    });
    const typeMap = new Map(types.map((type) => [type.key, type.id]));
    return this.loaderService.createBatchLoaders({
      options: args.map((arg) => ({
        ...arg,
        typeId: typeMap.get(arg.typeKey) as string,
      })),
    });
  }

  @Mutation(() => LoaderDto)
  @WmsOperation({ resource: 'loader', action: 'update' })
  @WmsMutationEvent({ event: 'loader.updated' })
  async updateLoader(@Args() args: UpdateLoaderArgs): Promise<LoaderDto> {
    return this.loaderService.updateLoader(args);
  }

  @Mutation(() => LoaderTypeDto)
  @WmsOperation({ resource: 'loader', action: 'create' })
  @WmsMutationEvent({ event: 'loader.type-created' })
  createLoaderType(@Args() args: CreateLoaderTypeArgs): Promise<LoaderTypeDto> {
    return this.loaderService.createLoaderType(args);
  }

  @Mutation(() => LoaderTypeDto)
  @WmsOperation({ resource: 'loader', action: 'update' })
  @WmsMutationEvent({ event: 'loader.type-updated' })
  async updateLoaderType(
    @Args() args: UpdateLoaderTypeArgs,
  ): Promise<LoaderTypeDto> {
    return this.loaderService.updateLoaderType(args);
  }
}
