import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Laporan, LaporanStatus, FileData } from './entities/laporan.entity';
import { CreateLaporanDto } from './dto/create-laporan.dto';
import { UpdateLaporanDto } from './dto/update-laporan.dto';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import {
  Laporan as LaporanInterface,
  FileObject,
} from './interfaces/laporan.interface';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class LaporanService {
  private readonly logger = new Logger(LaporanService.name);
  private bucket: string;
  private baseUrl: string;
  private s3Client: S3Client;

  constructor(
    @InjectRepository(Laporan)
    private laporanRepository: Repository<Laporan>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('WASABI_BUCKET') || '';
    this.baseUrl = `https://${this.bucket}.s3.wasabisys.com`;

    const region = this.configService.get<string>('WASABI_REGION');
    const endpoint = this.configService.get<string>('WASABI_ENDPOINT');
    const accessKeyId = this.configService.get<string>('WASABI_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('WASABI_SECRET_KEY');

    if (
      !accessKeyId ||
      !secretAccessKey ||
      !this.bucket ||
      !region ||
      !endpoint
    ) {
      throw new Error('Wasabi credentials are not properly configured');
    }

    this.s3Client = new S3Client({
      region: region,
      endpoint: `https://${endpoint}`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false,
    });
  }

  private async getSignedFileUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  private async uploadFileToS3(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const key = `${folder}/${Date.now()}-${file.originalname}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.configService.get('WASABI_BUCKET'),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return key;
  }

  private async deleteFileFromS3(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.configService.get('WASABI_BUCKET'),
        Key: key,
      }),
    );
  }

  private async uploadFiles(files: Express.Multer.File[]): Promise<FileData[]> {
    if (!files || files.length === 0) {
      return [];
    }

    try {
      const uploadPromises = files.map((file) =>
        this.uploadFileToS3(file, 'laporan-files'),
      );
      const fileKeys = await Promise.all(uploadPromises);

      return files.map((file, index) => ({
        name: file.originalname,
        path: fileKeys[index],
        size: file.size,
        mimetype: file.mimetype,
        originalname: file.originalname,
        filename: file.filename || file.originalname,
        fieldname: file.fieldname || 'file',
        encoding: file.encoding || '7bit',
        destination: file.destination || 'uploads',
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : 'No stack trace';
      this.logger.error(`Error uploading files: ${errorMessage}`, stackTrace);
      throw new InternalServerErrorException('Failed to upload files');
    }
  }

  private async mapToFileObject(fileData: FileData): Promise<FileObject> {
    try {
      const url = await this.getSignedFileUrl(fileData.path);
      return {
        id: fileData.filename,
        filename: fileData.filename,
        originalname: fileData.originalname,
        mimetype: fileData.mimetype,
        size: fileData.size,
        path: fileData.path,
        url,
      };
    } catch (error) {
      this.logger.error(
        `Error generating signed URL for file ${fileData.path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack trace',
      );
      // Return file object without URL if there's an error generating the signed URL
      return {
        id: fileData.filename,
        filename: fileData.filename,
        originalname: fileData.originalname,
        mimetype: fileData.mimetype,
        size: fileData.size,
        path: fileData.path,
      };
    }
  }

  private async cleanupFiles(files: FileData[]): Promise<void> {
    if (!files.length) return;

    const deletePromises = files
      .filter((file) => file && file.path)
      .map((file) =>
        this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.configService.get('WASABI_BUCKET'),
            Key: file.path,
          }),
        ),
      );

    await Promise.all(deletePromises);
  }

  async create(
    createLaporanDto: CreateLaporanDto,
    files: {
      needApproveFiles?: Express.Multer.File[];
      noNeedApproveFiles?: Express.Multer.File[];
    },
    isSubmitted: boolean = false,
  ): Promise<Laporan> {
    let needApproveFiles: FileData[] = [];
    let noNeedApproveFiles: FileData[] = [];

    try {
      // Upload need-approve files if any
      if (files.needApproveFiles?.length) {
        needApproveFiles = await Promise.all(
          files.needApproveFiles.map(async (file) => {
            const key = await this.uploadFileToS3(file, 'need-approve');
            return {
              name: file.originalname,
              path: key,
              size: file.size,
              mimetype: file.mimetype,
              originalname: file.originalname,
              filename: file.filename || file.originalname,
              fieldname: file.fieldname || 'file',
              encoding: file.encoding || '7bit',
              destination: 'need-approve',
            };
          }),
        );
      }

      // Upload no-need-approve files if any
      if (files.noNeedApproveFiles?.length) {
        noNeedApproveFiles = await Promise.all(
          files.noNeedApproveFiles.map(async (file) => {
            const key = await this.uploadFileToS3(file, 'no-need-approve');
            return {
              name: file.originalname,
              path: key,
              size: file.size,
              mimetype: file.mimetype,
              originalname: file.originalname,
              filename: file.filename || file.originalname,
              fieldname: file.fieldname || 'file',
              encoding: file.encoding || '7bit',
              destination: 'no-need-approve',
            };
          }),
        );
      }

      if (createLaporanDto.assignTo) {
        const user = await this.userRepository.findOneBy({
          id: createLaporanDto.assignTo,
        });
        if (!user) {
          throw new NotFoundException(
            `User with ID ${createLaporanDto.assignTo} not found`,
          );
        }
      }

      const status = createLaporanDto.status || LaporanStatus.ENTRY;
      console.log(`Setting laporan status to: ${status}`);

      const requestDate = new Date(createLaporanDto.requestDate);
      const deliveryDate = new Date(createLaporanDto.deliveryDate);

      const laporanData: Partial<Laporan> = {
        ...createLaporanDto,
        totalAmountIdr: Number(createLaporanDto.totalAmountIdr),
        totalAmountOriginalCurrency: Number(
          createLaporanDto.totalAmountOriginalCurrency,
        ),
        needApproveFiles,
        noNeedApproveFiles,
        status: status as LaporanStatus,
        requestDate,
        deliveryDate,
        emApproved: false,
        vendorApproved: false,
        userApproved: false,
        createdBy: createLaporanDto.userId || null,
        updatedBy: createLaporanDto.userId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const laporan = this.laporanRepository.create(laporanData);
      const savedLaporan = await this.laporanRepository.save(laporan);
      console.log(
        `Laporan created with ID: ${savedLaporan.id}, status: ${savedLaporan.status}`,
      );
      return savedLaporan;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : 'No stack trace';
      this.logger.error(`Error creating laporan: ${errorMessage}`, stackTrace);

      // Clean up uploaded files if there was an error
      try {
        await this.cleanupFiles([...needApproveFiles, ...noNeedApproveFiles]);
      } catch (cleanupError) {
        this.logger.error(
          'Error cleaning up files after failed laporan creation',
          cleanupError instanceof Error ? cleanupError.stack : 'No stack trace',
        );
      }

      throw new InternalServerErrorException('Failed to create laporan');
    }
  }

  async findAll(): Promise<LaporanInterface[]> {
    const laporans = await this.laporanRepository.find({
      relations: ['assignedTo'],
    });

    return Promise.all(
      laporans.map(async (laporan) => ({
        id: laporan.id,
        title: laporan.title || '',
        description: laporan.description || '',
        status: laporan.status,
        needApproveFiles: await Promise.all(
          (laporan.needApproveFiles || []).map(async (file) => ({
            id: file.filename,
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            url: await this.getSignedFileUrl(file.path),
          })),
        ),
        noNeedApproveFiles: await Promise.all(
          (laporan.noNeedApproveFiles || []).map(async (file) => ({
            id: file.filename,
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            url: await this.getSignedFileUrl(file.path),
          })),
        ),
        assignTo: laporan.assignTo,
        assignedTo: laporan.assignedTo,
        createdBy: laporan.createdBy || '',
        updatedBy: laporan.updatedBy || '',
        createdAt: laporan.createdAt,
        updatedAt: laporan.updatedAt,
        deletedAt: laporan.deletedAt,
        emApproved: laporan.emApproved,
        vendorApproved: laporan.vendorApproved,
        userApproved: laporan.userApproved,
        rejectedBy: laporan.rejectedBy,
        rejectedAt: laporan.rejectedAt,
        rejectReason: laporan.rejectReason,
        resubmissionCount: laporan.resubmissionCount || 0,
      })),
    );
  }

  async findOne(id: string): Promise<LaporanInterface> {
    try {
      const laporan = await this.laporanRepository.findOne({
        where: { id },
        relations: ['assignedTo'],
      });

      if (!laporan) {
        throw new NotFoundException(`Laporan with ID ${id} not found`);
      }

      // Convert FileData to FileObject with signed URLs
      const needApproveFiles = await Promise.all(
        (laporan.needApproveFiles || []).map((file) =>
          this.mapToFileObject(file as FileData),
        ),
      );

      const noNeedApproveFiles = await Promise.all(
        (laporan.noNeedApproveFiles || []).map((file) =>
          this.mapToFileObject(file as FileData),
        ),
      );

      // Map to LaporanInterface
      return {
        id: laporan.id,
        title: laporan.title || '',
        description: laporan.description || '',
        status: laporan.status,
        needApproveFiles,
        noNeedApproveFiles,
        assignTo: laporan.assignTo,
        assignedTo: laporan.assignedTo,
        createdBy: laporan.createdBy,
        updatedBy: laporan.updatedBy,
        createdAt: laporan.createdAt,
        updatedAt: laporan.updatedAt,
        deletedAt: laporan.deletedAt,
        emApproved: laporan.emApproved,
        vendorApproved: laporan.vendorApproved,
        userApproved: laporan.userApproved,
        rejectedBy: laporan.rejectedBy,
        rejectedAt: laporan.rejectedAt,
        rejectReason: laporan.rejectReason,
        resubmissionCount: laporan.resubmissionCount || 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : 'No stack trace';
      this.logger.error(`Error finding laporan: ${errorMessage}`, stackTrace);
      throw new InternalServerErrorException('Failed to find laporan');
    }
  }

  async findAssignedToUser(userId: string): Promise<LaporanInterface[]> {
    try {
      const laporans = await this.laporanRepository.find({
        where: { assignedTo: { id: userId } },
        relations: ['assignedTo'],
      });

      return Promise.all(
        laporans.map(async (laporan) => ({
          id: laporan.id,
          title: laporan.title || '',
          description: laporan.description || '',
          status: laporan.status,
          needApproveFiles: await Promise.all(
            (laporan.needApproveFiles || []).map(async (file) => ({
              id: file.filename,
              filename: file.filename,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path,
              url: await this.getSignedFileUrl(file.path),
            })),
          ),
          noNeedApproveFiles: await Promise.all(
            (laporan.noNeedApproveFiles || []).map(async (file) => ({
              id: file.filename,
              filename: file.filename,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path,
              url: await this.getSignedFileUrl(file.path),
            })),
          ),
          assignTo: laporan.assignTo,
          assignedTo: laporan.assignedTo,
          createdBy: laporan.createdBy,
          updatedBy: laporan.updatedBy,
          createdAt: laporan.createdAt,
          updatedAt: laporan.updatedAt,
          deletedAt: laporan.deletedAt,
          emApproved: laporan.emApproved,
          vendorApproved: laporan.vendorApproved,
          userApproved: laporan.userApproved,
          rejectedBy: laporan.rejectedBy,
          rejectedAt: laporan.rejectedAt,
          rejectReason: laporan.rejectReason,
          resubmissionCount: laporan.resubmissionCount || 0,
        })),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : 'No stack trace';
      this.logger.error(
        `Error finding laporans for user ${userId}: ${errorMessage}`,
        stackTrace,
      );
      throw new InternalServerErrorException('Failed to find laporans');
    }
  }

  async update(
    id: string,
    updateLaporanDto: UpdateLaporanDto,
    files?: {
      needApproveFiles?: Express.Multer.File[];
      noNeedApproveFiles?: Express.Multer.File[];
    },
  ) {
    if (updateLaporanDto.assignTo) {
      const user = await this.userRepository.findOneBy({
        id: updateLaporanDto.assignTo,
      });
      if (!user) {
        throw new NotFoundException(
          `User with ID ${updateLaporanDto.assignTo} not found`,
        );
      }
    }
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    if (updateLaporanDto.requestDate) {
      laporan.requestDate = new Date(updateLaporanDto.requestDate);
    }
    if (updateLaporanDto.deliveryDate) {
      laporan.deliveryDate = new Date(updateLaporanDto.deliveryDate);
    }

    const { status: newStatus, ...updateData } = updateLaporanDto;

    Object.assign(laporan, {
      ...updateData,
      requestDate: laporan.requestDate,
      deliveryDate: laporan.deliveryDate,
      status: laporan.status,
      resubmissionCount: laporan.resubmissionCount,
    });

    if (
      newStatus === LaporanStatus.RESUBMITTED &&
      laporan.status === LaporanStatus.REJECTED
    ) {
      laporan.status = LaporanStatus.RESUBMITTED;
      laporan.resubmissionCount = (laporan.resubmissionCount || 0) + 1;
    }

    if (files?.needApproveFiles?.length) {
      const uploadedFiles = await this.uploadFiles(files.needApproveFiles);
      laporan.needApproveFiles = [
        ...(laporan.needApproveFiles || []),
        ...uploadedFiles,
      ] as FileData[];
    }

    if (files?.noNeedApproveFiles?.length) {
      const uploadedFiles = await this.uploadFiles(files.noNeedApproveFiles);
      laporan.noNeedApproveFiles = [
        ...laporan.noNeedApproveFiles,
        ...uploadedFiles,
      ] as FileData[];
    }

    const savedLaporan = await this.laporanRepository.save(laporan);
    this.logger.log(`Laporan ${id} updated, new status: ${savedLaporan.status}`);
    return savedLaporan;
  }

  async resubmitLaporan(
    id: string,
    updateData?: UpdateLaporanDto & {
      needApproveFiles?: Express.Multer.File[];
      noNeedApproveFiles?: Express.Multer.File[];
    },
  ): Promise<Laporan> {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    const queryRunner = this.laporanRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const previousStatus = laporan.status;

      if (updateData) {
        const { needApproveFiles, noNeedApproveFiles, ...laporanData } = updateData;
        Object.assign(laporan, laporanData);

        if (needApproveFiles?.length) {
          const uploadedFiles = await this.uploadFiles(needApproveFiles);
          laporan.needApproveFiles = [
            ...(laporan.needApproveFiles || []),
            ...uploadedFiles,
          ] as FileData[];
        }

        if (noNeedApproveFiles?.length) {
          const uploadedFiles = await this.uploadFiles(noNeedApproveFiles);
          laporan.noNeedApproveFiles = [
            ...(laporan.noNeedApproveFiles || []),
            ...uploadedFiles,
          ] as FileData[];
        }
      }

      laporan.status = LaporanStatus.RESUBMITTED;

      if (previousStatus === LaporanStatus.REJECTED) {
        laporan.resubmissionCount = (laporan.resubmissionCount || 0) + 1;
      }

      laporan.emApproved = false;
      laporan.vendorApproved = false;
      laporan.userApproved = false;
      laporan.rejectedBy = null;
      laporan.rejectedAt = null;
      laporan.rejectReason = null;

      const savedLaporan = await queryRunner.manager.save(laporan);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully resubmitted laporan ${id} with status: ${savedLaporan.status}`,
      );
      return savedLaporan;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : 'No stack trace';

      this.logger.error(
        `Error resubmitting laporan ${id}: ${errorMessage}`,
        stackTrace,
      );

      if (!(error instanceof HttpException)) {
        throw new InternalServerErrorException({
          statusCode: 500,
          message: 'Failed to resubmit laporan',
          error: errorMessage,
        });
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async filterLaporan(
    status?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Laporan[]> {
    try {
      const query = this.laporanRepository.createQueryBuilder('laporan');

      if (status) {
        query.andWhere('laporan.status = :status', { status });
      }

      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          query.andWhere('laporan.createdAt >= :startDate', { startDate: start });
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          // Set to end of the day
          end.setHours(23, 59, 59, 999);
          query.andWhere('laporan.createdAt <= :endDate', { endDate: end });
        }
      }

      query.orderBy('laporan.createdAt', 'DESC');

      return await query.getMany();
    } catch (error) {
      this.logger.error('Error filtering laporan', error);
      throw new InternalServerErrorException('Failed to filter laporan');
    }
  }

  async submitLaporan(id: string): Promise<Laporan> {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    if (laporan.status && laporan.status !== LaporanStatus.DRAFT) {
      throw new BadRequestException('Laporan has already been submitted');
    }

    laporan.status = LaporanStatus.SUBMITTED;

    try {
      const savedLaporan = await this.laporanRepository.save(laporan);
      this.logger.log(`Laporan ${id} submitted successfully`);
      return savedLaporan;
    } catch (error) {
      this.logger.error(`Error submitting laporan: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to submit laporan');
    }
  }

  async approveLaporan(
    id: string,
    role: 'EM' | 'USER' | 'VENDOR',
  ): Promise<Laporan> {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    try {
      // Update approval status based on role
      if (role === 'EM') {
        laporan.emApproved = true;
      } else if (role === 'USER') {
        laporan.userApproved = true;
      } else if (role === 'VENDOR') {
        laporan.vendorApproved = true;
      }

      // Check if all required approvals are met
      if (laporan.emApproved && laporan.userApproved) {
        laporan.status = LaporanStatus.APPROVED;
      }

      return await this.laporanRepository.save(laporan);
    } catch (error) {
      this.logger.error(`Error approving laporan: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to approve laporan');
    }
  }

  async rejectLaporan(
    id: string,
    reason: string,
    userId: string,
  ): Promise<Laporan> {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    // Check if laporan is already rejected
    if (laporan.status === LaporanStatus.REJECTED) {
      throw new BadRequestException('Laporan has already been rejected');
    }

    try {
      laporan.status = LaporanStatus.REJECTED;
      laporan.rejectReason = reason;
      laporan.rejectedBy = userId;
      laporan.rejectedAt = new Date();
      laporan.emApproved = false;
      laporan.userApproved = false;
      laporan.vendorApproved = false;

      return await this.laporanRepository.save(laporan);
    } catch (error) {
      this.logger.error(`Error rejecting laporan: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to reject laporan');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    await this.laporanRepository.remove(laporan);
    return { message: 'Laporan berhasil dihapus' };
  }
}
