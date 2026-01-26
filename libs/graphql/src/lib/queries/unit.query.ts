import { Injectable } from '@nestjs/common';
import { UnitDto } from '../dto/unit.dto';
import { Query } from '@nestjs/graphql';
import { UnitService } from '@wms-module/core';

@Injectable()
export class UnitQuery {
  constructor(private readonly unitService: UnitService) {}
  @Query(() => [UnitDto])
  units(): Promise<UnitDto[]> {
    return this.unitService.unitRepository.findBy({});
  }
}
