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
  UseGuards,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { LaporanService } from './laporan.service';
import { CreateLaporanDto } from './dto/create-laporan.dto';
import { UpdateLaporanDto } from './dto/update-laporan.dto';
import { multerConfig } from '../config/multer.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';

@Controller('laporan')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles(UserRole.VENDOR)
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
  @Roles(UserRole.VENDOR, UserRole.EM)
  getLaporanDetail(@Param('id') id: string) {
    return this.laporanService.findOne(id);
  }

  @Get()
  @Roles(UserRole.VENDOR, UserRole.EM, UserRole.USER)
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
