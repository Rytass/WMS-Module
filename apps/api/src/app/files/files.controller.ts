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
import { FilesService, type UploadedFileInput } from './files.service';

/**
 * Served inline from the app's own origin, so anything a browser would run
 * (HTML, SVG with script) would execute as the app. Raster images only.
 */
const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

/** Matches the map component's own 30 MB upload ceiling. */
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  async upload(@UploadedFile() file: UploadedFileInput): Promise<FileEntity> {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`unsupported file type: ${file.mimetype}`);
    }

    return this.filesService.save(file);
  }

  @Get('get/:id')
  async get(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const file = await this.filesService.findById(id);

    const filename = file.extension
      ? `${file.name}.${file.extension}`
      : file.name;

    // Rows written before the upload allowlist existed may carry any type;
    // never hand one of those back as something a browser would render.
    res.setHeader(
      'Content-Type',
      ALLOWED_MIME_TYPES.has(file.mime)
        ? file.mime
        : 'application/octet-stream',
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `${ALLOWED_MIME_TYPES.has(file.mime) ? 'inline' : 'attachment'}; filename=${encodeURIComponent(filename)}`,
    );

    this.filesService.createReadStream(file.id).pipe(res);
  }
}
