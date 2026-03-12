import { Entity, PrimaryColumn } from 'typeorm';

export const LoaderUnitEntity = Symbol('LoaderUnitEntity');

@Entity('loader_units')
export class LoaderUnitEntityClass {
  @PrimaryColumn('varchar')
  id!: string;

  @PrimaryColumn('varchar')
  type!: string;
}
