import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileEntity } from './file.entity';
import { FilesService, UploadedFileInput } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: UploadedFileInput,
  ): Promise<FileEntity> {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    return this.filesService.save(file);
  }

  @Get('get/:id')
  async get(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const file = await this.filesService.findById(id);

    const filename = file.extension
      ? `${file.name}.${file.extension}`
      : file.name;

    res.setHeader('Content-Type', file.mime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename=${encodeURIComponent(filename)}`,
    );

    this.filesService.createReadStream(file.id).pipe(res);
  }
}
