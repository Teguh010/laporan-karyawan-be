import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { LaporanService } from './laporan.service';
import { CreateLaporanDto } from './dto/create-laporan.dto';
import { UpdateLaporanDto } from './dto/update-laporan.dto';
import { multerConfig } from '../config/multer.config';

@Controller('laporan')
export class LaporanController {
  constructor(private readonly laporanService: LaporanService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'needApproveFiles', maxCount: 10 },
        { name: 'noNeedApproveFiles', maxCount: 10 },
      ],
      multerConfig,
    ),
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

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'needApproveFiles', maxCount: 10 },
        { name: 'noNeedApproveFiles', maxCount: 10 },
      ],
      multerConfig,
    ),
  )
  async updateLaporan(
    @Param('id') id: string,
    @Body() updateLaporanDto: UpdateLaporanDto,
    @UploadedFiles()
    files?: {
      needApproveFiles?: Express.Multer.File[];
      noNeedApproveFiles?: Express.Multer.File[];
    },
  ) {
    return this.laporanService.update(id, updateLaporanDto, files);
  }

  @Delete(':id')
  async deleteLaporan(@Param('id') id: string) {
    return this.laporanService.remove(id);
  }
}
