import {
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Laporan, FileData, LaporanStatus } from './entities/laporan.entity';
import { CreateLaporanDto } from './dto/create-laporan.dto';
import { UpdateLaporanDto } from './dto/update-laporan.dto';
import { ConfigService } from '@nestjs/config';
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
    const uploadPromises = files.map(async (file) => {
      const key = await this.uploadFileToS3(file, 'uploads');
      return {
        name: file.originalname || 'unnamed-file',
        path: key,
        size: file.size,
        mimetype: file.mimetype,
        originalname: file.originalname || 'unnamed-file',
        filename: file.filename || file.originalname || 'unnamed-file',
        fieldname: file.fieldname || 'file',
        encoding: file.encoding || '7bit',
        destination: 'uploads',
      };
    });
    return await Promise.all(uploadPromises);
  }

  async create(
    createLaporanDto: CreateLaporanDto,
    files: {
      needApproveFiles?: Express.Multer.File[];
      noNeedApproveFiles?: Express.Multer.File[];
    },
    isSubmitted: boolean = false,
  ) {
    console.log(`Creating laporan with isSubmitted: ${isSubmitted}`);

    const needApproveFilesPromises =
      files.needApproveFiles?.map(async (file) => {
        const path = await this.uploadFileToS3(file, 'need-approve');
        return {
          name: file.originalname,
          path: path,
        };
      }) || [];

    const noNeedApproveFilesPromises =
      files.noNeedApproveFiles?.map(async (file) => {
        const path = await this.uploadFileToS3(file, 'no-need-approve');
        return {
          name: file.originalname,
          path: path,
        };
      }) || [];

    const [needApproveFiles, noNeedApproveFiles] = await Promise.all([
      Promise.all(needApproveFilesPromises),
      Promise.all(noNeedApproveFilesPromises),
    ]);

    // Set status based on isSubmitted
    const status = isSubmitted ? LaporanStatus.SUBMITTED : LaporanStatus.ENTRY;
    console.log(`Setting laporan status to: ${status}`);

    // Convert dates from DTO
    const requestDate = new Date(createLaporanDto.requestDate);
    const deliveryDate = new Date(createLaporanDto.deliveryDate);

    const laporan = this.laporanRepository.create({
      ...createLaporanDto,
      totalAmountIdr: Number(createLaporanDto.totalAmountIdr),
      totalAmountOriginalCurrency: Number(
        createLaporanDto.totalAmountOriginalCurrency,
      ),
      needApproveFiles,
      noNeedApproveFiles,
      status,
      requestDate,
      deliveryDate,
      emApproved: false,
      vendorApproved: false,
    });

    const savedLaporan = await this.laporanRepository.save(laporan);
    console.log(
      `Laporan created with ID: ${savedLaporan.id}, status: ${savedLaporan.status}`,
    );

    return savedLaporan;
  }

  async findAll() {
    const laporans = await this.laporanRepository.find();

    return await Promise.all(
      laporans.map(async (laporan) => ({
        ...laporan,
        needApproveFiles: await Promise.all(
          laporan.needApproveFiles.map(async (file) => ({
            ...file,
            url: await this.getSignedFileUrl(file.path),
          })),
        ),
        noNeedApproveFiles: await Promise.all(
          laporan.noNeedApproveFiles.map(async (file) => ({
            ...file,
            url: await this.getSignedFileUrl(file.path),
          })),
        ),
      })),
    );
  }

  async findOne(id: string) {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    return {
      ...laporan,
      needApproveFiles: await Promise.all(
        laporan.needApproveFiles.map(async (file) => ({
          ...file,
          url: await this.getSignedFileUrl(file.path),
        })),
      ),
      noNeedApproveFiles: await Promise.all(
        laporan.noNeedApproveFiles.map(async (file) => ({
          ...file,
          url: await this.getSignedFileUrl(file.path),
        })),
      ),
    };
  }

  async update(
    id: string,
    updateLaporanDto: UpdateLaporanDto,
    files?: {
      needApproveFiles?: Express.Multer.File[];
      noNeedApproveFiles?: Express.Multer.File[];
    },
  ) {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    // Update basic fields
    if (updateLaporanDto.requestDate) {
      laporan.requestDate = new Date(updateLaporanDto.requestDate);
    }
    if (updateLaporanDto.deliveryDate) {
      laporan.deliveryDate = new Date(updateLaporanDto.deliveryDate);
    }

    // Extract status to check for resubmission
    const { status: newStatus, ...updateData } = updateLaporanDto;

    // Update all fields except status and resubmissionCount
    Object.assign(laporan, {
      ...updateData,
      requestDate: laporan.requestDate,
      deliveryDate: laporan.deliveryDate,
      // Explicitly preserve the status and resubmissionCount
      // These should only be updated through specific methods (approve, reject, resubmit)
      status: laporan.status,
      resubmissionCount: laporan.resubmissionCount,
    });

    // Handle resubmission if needed
    if (
      newStatus === LaporanStatus.RESUBMITTED &&
      laporan.status === LaporanStatus.REJECTED
    ) {
      laporan.status = LaporanStatus.RESUBMITTED;
      laporan.resubmissionCount = (laporan.resubmissionCount || 0) + 1;
      laporan.rejectReason = null;
      laporan.rejectedAt = null;
      laporan.rejectedBy = null;
    }

    // Upload need approve files if they exist
    if (files?.needApproveFiles?.length) {
      const uploadedFiles = await this.uploadFiles(files.needApproveFiles);
      laporan.needApproveFiles = [
        ...laporan.needApproveFiles,
        ...uploadedFiles,
      ];
    }

    // Upload no need approve files if they exist
    if (files?.noNeedApproveFiles?.length) {
      const uploadedFiles = await this.uploadFiles(files.noNeedApproveFiles);
      laporan.noNeedApproveFiles = [
        ...laporan.noNeedApproveFiles,
        ...uploadedFiles,
      ];
    }

    const savedLaporan = await this.laporanRepository.save(laporan);
    console.log(`Laporan ${id} updated, new status: ${savedLaporan.status}`);
    return savedLaporan;
  }

  async resubmitLaporan(
    id: string,
    updateData?: UpdateLaporanDto & {
      needApproveFiles?: Express.Multer.File[];
      noNeedApproveFiles?: Express.Multer.File[];
    },
  ): Promise<Laporan> {
    const { needApproveFiles, noNeedApproveFiles, ...updateFields } =
      updateData || {};

    // Start a transaction
    const queryRunner =
      this.laporanRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get the existing laporan
      const laporan = await queryRunner.manager.findOne(Laporan, {
        where: { id },
      });

      if (!laporan) {
        throw new NotFoundException(`Laporan with ID ${id} not found`);
      }

      // Store previous status before updating
      const previousStatus = laporan.status;

      // Update laporan fields
      Object.assign(laporan, updateFields);

      // Handle file uploads
      if (needApproveFiles?.length) {
        const uploadedFiles = await this.uploadFiles(needApproveFiles);
        laporan.needApproveFiles = [
          ...(laporan.needApproveFiles || []),
          ...uploadedFiles,
        ];
      }

      if (noNeedApproveFiles?.length) {
        const uploadedFiles = await this.uploadFiles(noNeedApproveFiles);
        laporan.noNeedApproveFiles = [
          ...(laporan.noNeedApproveFiles || []),
          ...uploadedFiles,
        ];
      }

      // Set status to resubmitted
      laporan.status = LaporanStatus.RESUBMITTED;

      // If previous status was rejected, increment resubmission count
      if (previousStatus === LaporanStatus.REJECTED) {
        laporan.resubmissionCount = (laporan.resubmissionCount || 0) + 1;
      }

      // Reset approval and rejection fields
      laporan.emApproved = false;
      laporan.vendorApproved = false;
      laporan.userApproved = false;
      laporan.rejectedBy = null;
      laporan.rejectedAt = null;
      laporan.rejectReason = null;

      // Save the updated laporan
      const savedLaporan = await queryRunner.manager.save(laporan);

      // Log the status update
      this.logger.log(
        `Laporan ${id} status updated from ${previousStatus} to ${savedLaporan.status}`,
      );

      // Verify the status was actually updated
      if (savedLaporan.status !== LaporanStatus.RESUBMITTED) {
        this.logger.warn(
          `Expected status to be RESUBMITTED but got ${savedLaporan.status} for laporan ${id}`,
        );
      }

      // Commit the transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully resubmitted laporan ${id} with status: ${savedLaporan.status}`,
      );

      return savedLaporan;
    } catch (error) {
      // Rollback the transaction on error
      await queryRunner.rollbackTransaction();

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : 'No stack trace';

      this.logger.error(
        `Error resubmitting laporan ${id}: ${errorMessage}`,
        stackTrace,
      );

      // Re-throw with more context if it's not already an HTTP exception
      if (!(error instanceof HttpException)) {
        throw new InternalServerErrorException({
          statusCode: 500,
          message: 'Failed to resubmit laporan',
          error: errorMessage,
        });
      }

      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async filterLaporan(
    status?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Laporan[]> {
    const query = this.laporanRepository.createQueryBuilder('laporan');

    if (status) {
      query.andWhere('laporan.status = :status', { status });
    }

    if (startDate) {
      const start = new Date(startDate);
      query.andWhere('laporan.createdAt >= :startDate', { startDate: start });
    }

    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999Z`);
      query.andWhere('laporan.createdAt <= :endDate', { endDate: end });
    }

    query.orderBy('laporan.createdAt', 'DESC');

    const laporans = await query.getMany();

    // Add signed URLs for files
    return await Promise.all(
      laporans.map(async (laporan) => {
        const needApproveFiles = await Promise.all(
          laporan.needApproveFiles.map(async (file) => ({
            ...file,
            url: await this.getSignedFileUrl(file.path),
          })),
        );

        const noNeedApproveFiles = await Promise.all(
          laporan.noNeedApproveFiles.map(async (file) => ({
            ...file,
            url: await this.getSignedFileUrl(file.path),
          })),
        );

        return {
          ...laporan,
          needApproveFiles,
          noNeedApproveFiles,
        };
      }),
    );
  }

  // Method untuk submit laporan
  async submitLaporan(id: string): Promise<Laporan> {
    const laporan = await this.laporanRepository.findOne({ where: { id } });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    console.log(`Submitting laporan ${id}, current status: ${laporan.status}`);

    // Handle different submission scenarios
    if (laporan.status === LaporanStatus.RESUBMITTED) {
      // For resubmitted laporan, just update the status to 'submitted' if both approvals are done
      if (!laporan.emApproved || !laporan.userApproved) {
        throw new Error(
          'Laporan yang diresubmit harus disetujui oleh EM dan USER sebelum disubmit',
        );
      }
      laporan.status = LaporanStatus.SUBMITTED;
    } else if (laporan.status === LaporanStatus.ENTRY) {
      // For new submissions
      laporan.status = LaporanStatus.SUBMITTED;
    } else {
      throw new Error(
        `Laporan tidak dapat disubmit dengan status ${laporan.status}`,
      );
    }

    const savedLaporan = await this.laporanRepository.save(laporan);
    console.log(`Laporan ${id} submitted, new status: ${savedLaporan.status}`);

    return savedLaporan;
  }

  async approveLaporan(id: string, role: string): Promise<Laporan> {
    const laporan = await this.laporanRepository.findOne({ where: { id } });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    if (role === 'EM') {
      laporan.emApproved = true;
    } else if (role === 'USER') {
      laporan.userApproved = true;
    }

    // If both EM and USER have approved, update status to APPROVED
    if (laporan.emApproved && laporan.userApproved) {
      laporan.status = LaporanStatus.APPROVED;
    }

    return this.laporanRepository.save(laporan);
  }

  async rejectLaporan(
    id: string,
    reason: string,
    userId: string,
  ): Promise<Laporan> {
    const laporan = await this.laporanRepository.findOne({ where: { id } });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    laporan.status = LaporanStatus.REJECTED;
    laporan.rejectReason = reason;
    laporan.rejectedBy = userId;
    laporan.rejectedAt = new Date();
    laporan.emApproved = false;
    laporan.userApproved = false;

    return this.laporanRepository.save(laporan);
  }

  async remove(id: string): Promise<{ message: string }> {
    const laporan = await this.laporanRepository.findOne({ where: { id } });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    await this.laporanRepository.remove(laporan);
    return { message: 'Laporan berhasil dihapus' };
  }
}
