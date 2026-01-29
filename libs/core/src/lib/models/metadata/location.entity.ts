import { LocationEntity as BaseLocationEntity } from '@rytass/wms-base-nestjs-module';
import { ChildEntity, Column } from 'typeorm';

export const LocationEntity = Symbol('LocationEntity');
export const WarehouseMapEntity = Symbol('WarehouseMapEntity');
@ChildEntity()
export class LocationEntityClass extends BaseLocationEntity {
  @Column({ type: 'text' })
  description!: string;
}
