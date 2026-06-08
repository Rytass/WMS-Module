import { Injectable } from '@nestjs/common';
import { UnitDto } from '../dto/unit.dto';
import { Query } from '@nestjs/graphql';
import { UnitService } from '@rytass/wms-module-core';
import { WmsOperation } from '../auth';

@Injectable()
export class UnitQuery {
  constructor(private readonly unitService: UnitService) {}
  @Query(() => [UnitDto])
  @WmsOperation({ resource: 'unit', action: 'read' })
  units(): Promise<UnitDto[]> {
    return this.unitService.unitRepository.findBy({});
  }
}
