import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  mime!: string;

  @Column({ type: 'varchar', length: 16 })
  extension!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
