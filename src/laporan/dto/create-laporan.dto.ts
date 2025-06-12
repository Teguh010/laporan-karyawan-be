import { IsString, IsNotEmpty, IsNumber, IsDate, IsOptional, IsEnum, IsBoolean, IsArray } from 'class-validator';

export enum PoType {
  PURCHASE_ORDER = 'purchase_order',
  DIRECT_PURCHASE = 'direct_purchase'
}

export enum AssetType {
  FIXED_ASSET = 'fixed_asset',
  CONSUMABLE = 'consumable'
}

export class CreateLaporanDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  requestName: string;

  @IsString()
  @IsNotEmpty()
  companyCode: string;

  @IsString()
  @IsNotEmpty()
  requestObjective: string;

  @IsString()
  @IsNotEmpty()
  requestBackground: string;

  @IsEnum(PoType)
  @IsNotEmpty()
  poType: PoType;

  @IsEnum(AssetType)
  @IsNotEmpty()
  assetType: AssetType;

  @IsNumber()
  @IsNotEmpty()
  totalAmountIdr: number;

  @IsNumber()
  @IsNotEmpty()
  totalAmountOriginalCurrency: number;

  @IsString()
  @IsOptional()
  remarks: string;

  @IsString()
  @IsNotEmpty()
  assignTo: string;

  @IsDate()
  @IsNotEmpty()
  requestDate: Date;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsNotEmpty()
  buyer: string;

  @IsDate()
  @IsNotEmpty()
  deliveryDate: Date;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsBoolean()
  @IsOptional()
  emApproved: boolean;

  @IsBoolean()
  @IsOptional()
  vendorApproved: boolean;

  @IsArray()
  needApproveFiles?: Array<{
    name: string;
    path: string;
  }>;

  @IsArray()
  noNeedApproveFiles?: Array<{
    name: string;
    path: string;
  }>;
}