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
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Laporan } from './entities/laporan.entity';
import { LaporanService } from './laporan.service';
import { CreateLaporanDto } from './dto/create-laporan.dto';
import { UpdateLaporanDto } from './dto/update-laporan.dto';
import { ApproveLaporanDto } from './dto/approve-laporan.dto';
import { multerConfig } from '../config/multer.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LaporanInterface } from './interfaces/laporan.interface';

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
@ApiTags('laporan')
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
    @Query('submit') submit?: string,
  ) {
    console.log(`Creating laporan with submit parameter: ${submit}`);
    const isSubmitted = submit === 'true';
    console.log(`isSubmitted value: ${isSubmitted}`);
    return this.laporanService.create(createLaporanDto, files, isSubmitted);
  }

  @Get()
  @Roles(UserRole.VENDOR, UserRole.EM, UserRole.USER)
  @ApiOperation({ summary: 'Get all laporans' })
  @ApiResponse({
    status: 200,
    description: 'Return all laporans.',
    type: [Laporan],
  })
  async findAll(): Promise<LaporanInterface[]> {
    return await this.laporanService.findAll();
  }

  @Get('assigned/:userId')
  @Roles(UserRole.VENDOR, UserRole.EM, UserRole.USER)
  @ApiOperation({ summary: 'Get laporans assigned to a specific user' })
  @ApiResponse({
    status: 200,
    description: 'Return laporans assigned to the user.',
    type: [Laporan],
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findAssignedToUser(
    @Param('userId') userId: string,
  ): Promise<LaporanInterface[]> {
    const laporans = await this.laporanService.findAssignedToUser(userId);
    return laporans;
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
  @Roles(UserRole.EM, UserRole.USER, UserRole.VENDOR)
  async getLaporanByStatus(@Param('status') status: string) {
    return this.laporanService.filterLaporan(status);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EM, UserRole.USER, UserRole.VENDOR)
  async approveLaporan(
    @Param('id') id: string,
    @Body() approveDto: ApproveLaporanDto,
    @Req() request: RequestWithUser,
  ) {
    console.log('User data:', request.user);
    console.log(`Approval role: ${approveDto.role}`);

    return this.laporanService.approveLaporan(
      id,
      approveDto.role as 'EM' | 'USER' | 'VENDOR',
    );
  }

  @Put(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.EM)
  async assignLaporan(
    @Param('id') id: string,
    @Body() assignDto: { userId: string | null },
  ) {
    console.log(`Assigning laporan ${id} to user ${assignDto.userId}`);
    return this.laporanService.assignTo(id, assignDto.userId);
  }

  @Put(':id/reject')
  @Roles(UserRole.EM, UserRole.USER)
  async rejectLaporan(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() request: RequestWithUser,
  ) {
    try {
      console.log(`Rejection request received for laporan ${id}`);
      console.log(`Rejection reason:`, body.reason);

      if (!body.reason) {
        throw new Error('Alasan penolakan harus diisi');
      }

      const result = await this.laporanService.rejectLaporan(
        id,
        body.reason,
        request.user.id, // Using id instead of userId to match the RequestWithUser interface
      );
      return result;
    } catch (error) {
      console.error('Error rejecting laporan:', error);
      throw error;
    }
  }

  @Put(':id/resubmit')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'needApproveFiles', maxCount: 10 },
      { name: 'noNeedApproveFiles', maxCount: 10 },
    ]),
  )
  async resubmitLaporan(
    @Param('id') id: string,
    @Body() updateData: UpdateLaporanDto,
    @UploadedFiles()
    files?: {
      needApproveFiles?: Express.Multer.File[];
      noNeedApproveFiles?: Express.Multer.File[];
    },
  ): Promise<Laporan> {
    try {
      // Log the resubmit request
      const logData = {
        updateData,
        files: files
          ? {
              needApproveFiles: files.needApproveFiles?.map((f) => ({
                originalname: f.originalname,
                size: f.size,
                mimetype: f.mimetype,
              })),
              noNeedApproveFiles: files.noNeedApproveFiles?.map((f) => ({
                originalname: f.originalname,
                size: f.size,
                mimetype: f.mimetype,
              })),
            }
          : 'No files',
      };
      console.log(`Resubmit request received for laporan ${id}`, logData);

      // Transform uploaded files to match the expected format
      const dataToUpdate: any = { ...updateData };

      if (files) {
        if (files.needApproveFiles) {
          dataToUpdate.needApproveFiles = files.needApproveFiles.map(
            (file) =>
              ({
                name: file.originalname,
                path: file.path || file.filename || '',
                size: file.size,
                mimetype: file.mimetype,
                originalname: file.originalname,
                filename: file.filename,
                fieldname: file.fieldname,
                encoding: file.encoding,
                destination: file.destination,
              }) as any,
          );
        }
        if (files.noNeedApproveFiles) {
          dataToUpdate.noNeedApproveFiles = files.noNeedApproveFiles.map(
            (file) =>
              ({
                name: file.originalname,
                path: file.path || file.filename || '',
                size: file.size,
                mimetype: file.mimetype,
                originalname: file.originalname,
                filename: file.filename,
                fieldname: file.fieldname,
                encoding: file.encoding,
                destination: file.destination,
              }) as any,
          );
        }
      }

      // Call the service with the combined data
      return await this.laporanService.resubmitLaporan(id, dataToUpdate);
    } catch (error: unknown) {
      console.error('Error resubmitting laporan:', error);
      // Re-throw the error to ensure it's properly handled by NestJS
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Failed to resubmit laporan',
        error: errorMessage,
      });
    }
  }

  @Delete(':id')
  @Roles(UserRole.VENDOR, UserRole.EM)
  async deleteLaporan(@Param('id') id: string) {
    return this.laporanService.remove(id);
  }

  // Tambahkan endpoint untuk submit laporan
  @Put(':id/submit')
  @Roles(UserRole.VENDOR)
  async submitLaporan(@Param('id') id: string) {
    console.log(`Submit request received for laporan ${id}`);
    return this.laporanService.submitLaporan(id);
  }
}
