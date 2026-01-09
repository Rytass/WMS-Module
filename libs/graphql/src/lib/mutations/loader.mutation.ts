import { Injectable } from '@nestjs/common';
import { LoaderService } from '@wms-module/core';
import { LoaderDto, LoaderTypeDto } from '../dto';
import { Args, Mutation } from '@nestjs/graphql';
import {
  CreateLoaderTypeArgs,
  UpdateLoaderTypeArgs,
} from '../inputs/create-loader-type.args';
import {
  CreateLoaderArgs,
  UpdateLoaderArgs,
} from '../inputs/create-loader.args';
@Injectable()
export class LoaderMutation {
  constructor(private readonly loaderService: LoaderService) {}

  @Mutation(() => [LoaderDto])
  async createLoader(@Args() args: CreateLoaderArgs): Promise<LoaderDto[]> {
    return this.loaderService.createLoader(args);
  }

  @Mutation(() => [LoaderDto])
  async createBatchLoader(
    @Args({ type: () => [CreateLoaderArgs] }) args: CreateLoaderArgs[]
  ): Promise<LoaderDto[]> {
    return this.loaderService.createBatchLoaders({ options: args });
  }

  @Mutation(() => LoaderDto)
  async updateLoader(@Args() args: UpdateLoaderArgs): Promise<LoaderDto> {
    return this.loaderService.updateLoader(args);
  }

  @Mutation(() => LoaderTypeDto)
  createLoaderType(@Args() args: CreateLoaderTypeArgs): Promise<LoaderTypeDto> {
    return this.loaderService.createLoaderType(args);
  }

  @Mutation(() => LoaderTypeDto)
  async updateLoaderType(
    @Args() args: UpdateLoaderTypeArgs
  ): Promise<LoaderTypeDto> {
    return this.loaderService.updateLoaderType(args);
  }
}
