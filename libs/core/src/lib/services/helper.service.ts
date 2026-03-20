import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DateTime } from 'luxon';

@Injectable()
export class HelperService {
  constructor(private readonly dataSource: DataSource) {}

  async getSeq(
    prefix: string,
    manager = this.dataSource.manager,
  ): Promise<string> {
    const dateStr = DateTime.now().toFormat('yyyyMMdd');
    const seqName = `${prefix}_${dateStr}`;
    const quotedSeqName = `"${seqName}"`;

    await this.dataSource.query(
      `CREATE SEQUENCE IF NOT EXISTS ${quotedSeqName} START 1`,
    );

    const [{ seq_num }] = await manager.query(`SELECT nextval($1) as seq_num`, [
      `"${seqName}"`,
    ]);
    const serialNumber = String(seq_num).padStart(4, '0');

    return `${dateStr}${serialNumber}`;
  }
}
