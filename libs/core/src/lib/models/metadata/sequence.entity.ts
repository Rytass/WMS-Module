import { Column, Entity, PrimaryColumn } from 'typeorm';

export const SequenceEntity = Symbol('SequenceEntity');

/**
 * One counter per row, for `sequenceStorage: 'table'`. `key` is the counter's
 * name (`TO_20261102`, `P_SEQ`, …), `value` the last number handed out.
 */
@Entity('sequences')
export class SequenceEntityClass {
  @PrimaryColumn({ type: 'varchar' })
  key!: string;

  @Column({ type: 'bigint', default: 0 })
  value!: string;
}
