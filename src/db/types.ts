// Type definitions for database records
import type { LocalAssetRecord } from "../types";

export interface AssetWithUser extends LocalAssetRecord {
  userId?: number | null;
  username?: string | null;
}

export interface AdminPromotion {
  id: number;
  promotedUserId: number;
  promotedUsername: string;
  promotedUserEmail?: string | null;
  promotedByAdminId: number;
  promotedByAdminUsername: string;
  promotionTimestampMs: number;
}

export interface DeletedAssetRecord {
  id: number;
  assetFilename: string;
  assetOriginalId: number | null;
  originalUploaderId: number | null;
  originalUploaderUsername: string | null;
  imageBase64?: string | null;
  mimeType?: string | null;
  deletedByAdminId: number;
  deletedByAdminUsername: string;
  deletionTimestampMs: number;
}

export interface DeletedUserRecord {
  id: number;
  deletedUserId: number;
  deletedUsername: string;
  deletedEmail: string;
  deletedRole: string;
  deletedByAdminId: number;
  deletedByAdminUsername: string;
  deletionTimestampMs: number;
}

export interface FileRecord {
  id: number;
  filename: string;
  mimeType: string;
  localUri: string;
  fileSizeBytes?: number | null;
  fileType: string; // 'csv' | 'excel'
  parsedPreview?: string | null; // JSON string of parsed data preview
  status: "pending" | "uploaded" | "failed" | "uploading";
  retries: number;
  timestampMs: number;
  serverId?: string | null;
  userId?: number | null;
  username?: string | null;
}
