import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export const UnitEntity = Symbol('UnitEntity');
@Entity('units')
export class UnitEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  key!: string;
}
