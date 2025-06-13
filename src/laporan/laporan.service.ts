import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Laporan } from './entities/laporan.entity';
import { CreateLaporanDto } from './dto/create-laporan.dto';
import { UpdateLaporanDto } from './dto/update-laporan.dto';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UserRole } from '../auth/enums/role.enum';

@Injectable()
export class LaporanService {
  private s3Client: S3Client;
  private baseUrl: string;
  private bucket: string;

  constructor(
    @InjectRepository(Laporan)
    private laporanRepository: Repository<Laporan>,
    private configService: ConfigService,
  ) {
    const region = this.configService.get<string>('WASABI_REGION');
    const endpoint = this.configService.get<string>('WASABI_ENDPOINT');
    const bucket = this.configService.get<string>('WASABI_BUCKET');
    const accessKeyId = this.configService.get<string>('WASABI_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('WASABI_SECRET_KEY');

    if (!accessKeyId || !secretAccessKey || !bucket || !region || !endpoint) {
      throw new Error('Wasabi credentials are not properly configured');
    }

    this.bucket = bucket;
    this.baseUrl = `https://${this.bucket}.s3.wasabisys.com`;

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

  async create(
    createLaporanDto: CreateLaporanDto,
    files: any,
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

    // Set status berdasarkan isSubmitted
    const status = isSubmitted ? 'submitted' : 'entry';
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
      status: status,
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

  async update(id: string, updateLaporanDto: UpdateLaporanDto, files?: any) {
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

    // Only update fields that are present in the DTO
    Object.assign(laporan, {
      ...updateLaporanDto,
      requestDate: laporan.requestDate,
      deliveryDate: laporan.deliveryDate,
    });

    // Update files if provided
    if (files) {
      if (files.needApproveFiles) {
        // Delete old files
        await Promise.all(
          laporan.needApproveFiles.map((file) =>
            this.deleteFileFromS3(file.path),
          ),
        );

        // Upload new files
        laporan.needApproveFiles = await Promise.all(
          files.needApproveFiles.map(async (file) => {
            const path = await this.uploadFileToS3(file, 'need-approve');
            return {
              name: file.originalname,
              path: path,
            };
          }),
        );
      }

      if (files.noNeedApproveFiles) {
        // Delete old files
        await Promise.all(
          laporan.noNeedApproveFiles.map((file) =>
            this.deleteFileFromS3(file.path),
          ),
        );

        // Upload new files
        laporan.noNeedApproveFiles = await Promise.all(
          files.noNeedApproveFiles.map(async (file) => {
            const path = await this.uploadFileToS3(file, 'no-need-approve');
            return {
              name: file.originalname,
              path: path,
            };
          }),
        );
      }
    }

    return this.laporanRepository.save(laporan);
  }

  async remove(id: string) {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    // Delete files from S3
    const allFiles = [
      ...(laporan.needApproveFiles || []),
      ...(laporan.noNeedApproveFiles || []),
    ];

    await Promise.all(allFiles.map((file) => this.deleteFileFromS3(file.path)));

    await this.laporanRepository.remove(laporan);
    return { message: `Laporan with ID ${id} has been deleted` };
  }

  // Tambahkan method untuk approval
  async approveLaporan(id: string, role: string) {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    console.log(`Before approval - Laporan ${id}:`, {
      status: laporan.status,
      emApproved: laporan.emApproved,
      vendorApproved: laporan.vendorApproved,
    });

    // Update approval berdasarkan role
    if (role === UserRole.EM) {
      laporan.emApproved = true;
      console.log(`EM approved laporan ${id}`);
    } else if (role === UserRole.USER) {
      laporan.vendorApproved = true;
      console.log(`USER approved laporan ${id}`);
    } else {
      console.log(`Unknown role: ${role}`);
    }

    // Update status jika kedua role sudah approve
    if (laporan.emApproved && laporan.vendorApproved) {
      laporan.status = 'approved';
      console.log(`Laporan ${id} fully approved, status updated to 'approved'`);
    } else {
      console.log(
        `Laporan ${id} not fully approved yet. emApproved: ${laporan.emApproved}, vendorApproved: ${laporan.vendorApproved}`,
      );
    }

    const savedLaporan = await this.laporanRepository.save(laporan);

    console.log(`After approval - Laporan ${id}:`, {
      status: savedLaporan.status,
      emApproved: savedLaporan.emApproved,
      vendorApproved: savedLaporan.vendorApproved,
    });

    return savedLaporan;
  }

  async rejectLaporan(id: string) {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    laporan.status = 'not_approved';
    return this.laporanRepository.save(laporan);
  }

  async findByStatus(status: string) {
    const laporans = await this.laporanRepository.find({
      where: { status },
    });

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

  async filterLaporan(status?: string, startDate?: string, endDate?: string) {
    // Build query conditions
    const whereConditions: any = {};

    if (status) {
      whereConditions.status = status;
    }

    if (startDate || endDate) {
      whereConditions.createdAt = {};

      if (startDate) {
        whereConditions.createdAt = {
          ...whereConditions.createdAt,
          gte: new Date(startDate),
        };
      }

      if (endDate) {
        whereConditions.createdAt = {
          ...whereConditions.createdAt,
          lte: new Date(endDate + 'T23:59:59.999Z'), // End of the day
        };
      }
    }

    console.log('Filter conditions:', whereConditions);

    // Execute query
    const laporans = await this.laporanRepository.find({
      where: whereConditions,
      order: { createdAt: 'DESC' },
    });

    // Add signed URLs for files
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

  // Tambahkan method untuk submit laporan
  async submitLaporan(id: string) {
    const laporan = await this.laporanRepository.findOneBy({ id });
    if (!laporan) {
      throw new NotFoundException(`Laporan with ID ${id} not found`);
    }

    console.log(`Submitting laporan ${id}, current status: ${laporan.status}`);

    laporan.status = 'submitted';
    const savedLaporan = await this.laporanRepository.save(laporan);

    console.log(`Laporan ${id} submitted, new status: ${savedLaporan.status}`);

    return savedLaporan;
  }
}
