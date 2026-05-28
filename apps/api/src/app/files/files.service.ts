import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream } from 'fs';
import { writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { Readable } from 'stream';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { FileEntity } from './file.entity';

export interface UploadedFileInput {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  private readonly storagePath =
    process.env.STORAGE_PATH || join(__dirname, 'assets');

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
  ) {}

  async save(file: UploadedFileInput): Promise<FileEntity> {
    const id = uuid();
    const extension = extname(file.originalname).replace(/^\./, '');
    const name = extension
      ? file.originalname.slice(0, -(extension.length + 1))
      : file.originalname;

    await writeFile(join(this.storagePath, id), file.buffer);

    return this.fileRepo.save(
      this.fileRepo.create({
        id,
        name,
        mime: file.mimetype,
        extension,
      }),
    );
  }

  async findById(id: string): Promise<FileEntity> {
    const file = await this.fileRepo.findOneBy({ id });

    if (!file) {
      throw new NotFoundException(`File ${id} not found`);
    }

    return file;
  }

  createReadStream(id: string): Readable {
    return createReadStream(join(this.storagePath, id));
  }
}
