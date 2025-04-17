import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('laporan')
export class LaporanController {
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'needApproveFiles', maxCount: 10 },
      { name: 'noNeedApproveFiles', maxCount: 10 },
    ]),
  )
  async createLaporan(
    @Body() createLaporanDto: CreateLaporanDto,
    @UploadedFiles()
    files: {
      needApproveFiles?: Express.Multer.File[];
      noNeedApproveFiles?: Express.Multer.File[];
    },
  ) {
    return this.laporanService.create(createLaporanDto, files);
  }

  @Get(':id')
  getLaporanDetail(@Param('id') id: string) {
    return this.laporanService.findOne(id);
  }

  @Get()
  getAllLaporan() {
    return this.laporanService.findAll();
  }
}
