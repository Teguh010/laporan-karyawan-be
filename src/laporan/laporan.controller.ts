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
  Req,
  Query,
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
import { Request } from 'express';

// Tambahkan interface untuk request user
interface RequestWithUser extends Request {
  user: {
    id: string;
    username: string;
    role: string;
  };
}

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

  @Get()
  @Roles(UserRole.VENDOR, UserRole.EM, UserRole.USER)
  getAllLaporan() {
    return this.laporanService.findAll();
  }

  // PENTING: Endpoint dengan path spesifik harus didefinisikan SEBELUM endpoint dengan parameter dinamis
  @Get('filter')
  @Roles(UserRole.VENDOR, UserRole.EM, UserRole.USER)
  async filterLaporan(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    console.log(
      `Filtering laporan - Status: ${status}, Start Date: ${startDate}, End Date: ${endDate}`,
    );
    return this.laporanService.filterLaporan(status, startDate, endDate);
  }

  @Get('status/:status')
  @Roles(UserRole.VENDOR, UserRole.EM, UserRole.USER)
  getLaporanByStatus(@Param('status') status: string) {
    return this.laporanService.findByStatus(status);
  }

  // Endpoint dengan parameter dinamis harus didefinisikan SETELAH endpoint dengan path spesifik
  @Get(':id')
  @Roles(UserRole.VENDOR, UserRole.EM, UserRole.USER)
  getLaporanDetail(@Param('id') id: string) {
    return this.laporanService.findOne(id);
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
  @Roles(UserRole.VENDOR, UserRole.EM, UserRole.USER)
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

  @Put(':id/approve')
  @Roles(UserRole.EM, UserRole.USER)
  async approveLaporan(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
  ) {
    console.log(`Approval request received for laporan ${id}`);
    console.log(`User data:`, request.user);
    console.log(`User role: ${request.user.role}`);

    return this.laporanService.approveLaporan(id, request.user.role);
  }

  @Put(':id/reject')
  @Roles(UserRole.EM, UserRole.USER)
  async rejectLaporan(@Param('id') id: string) {
    return this.laporanService.rejectLaporan(id);
  }

  @Delete(':id')
  @Roles(UserRole.VENDOR, UserRole.EM)
  async deleteLaporan(@Param('id') id: string) {
    return this.laporanService.remove(id);
  }
}
