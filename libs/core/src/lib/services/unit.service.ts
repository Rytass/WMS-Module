import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UnitEntityClass } from '../models';

@Injectable()
export class UnitService {
  readonly unitRepository: Repository<UnitEntityClass>;
  constructor(private readonly dataSource: DataSource) {
    this.unitRepository =
      this.dataSource.getRepository<UnitEntityClass>(UnitEntityClass);
  }
}
