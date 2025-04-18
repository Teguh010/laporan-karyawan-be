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

  async create(createLaporanDto: CreateLaporanDto, files: any) {
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

    const laporan = this.laporanRepository.create({
      ...createLaporanDto,
      needApproveFiles,
      noNeedApproveFiles,
    });

    return this.laporanRepository.save(laporan);
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
    Object.assign(laporan, updateLaporanDto);

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
}
