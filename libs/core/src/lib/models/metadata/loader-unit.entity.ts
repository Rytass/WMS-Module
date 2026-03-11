import { Entity, PrimaryColumn } from 'typeorm';

@Entity('loader_units')
export class LoaderUnitEntityClass {
  @PrimaryColumn('varchar')
  id!: string;

  @PrimaryColumn('varchar')
  type!: string;
}
