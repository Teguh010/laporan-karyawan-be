import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export enum PoType {
  PURCHASE_ORDER = 'purchase_order',
  DIRECT_PURCHASE = 'direct_purchase',
}

export enum AssetType {
  FIXED_ASSET = 'fixed_asset',
  CONSUMABLE = 'consumable',
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

  @IsString()
  @IsNotEmpty()
  totalAmountIdr: string;

  @IsString()
  @IsNotEmpty()
  totalAmountOriginalCurrency: string;

  @IsString()
  @IsOptional()
  remarks: string;

  @IsString()
  @IsNotEmpty()
  assignTo: string;

  @IsString()
  @IsNotEmpty()
  requestDate: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsNotEmpty()
  buyer: string;

  @IsString()
  @IsNotEmpty()
  deliveryDate: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsOptional()
  status: string;

  @IsBoolean()
  @IsOptional()
  emApproved: boolean;

  @IsBoolean()
  @IsOptional()
  vendorApproved: boolean;

  @IsOptional()
  needApproveFiles?: Array<{
    name: string;
    path: string;
  }>;

  @IsOptional()
  noNeedApproveFiles?: Array<{
    name: string;
    path: string;
  }>;
}
