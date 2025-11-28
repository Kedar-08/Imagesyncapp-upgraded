// Admin tracking operations (promotions, deletions)
import { execSql, queryAll, queryOne } from "../utils/dbHelpers";
import type {
  AdminPromotion,
  DeletedAssetRecord,
  DeletedUserRecord,
} from "./types";

export async function getAdminPromotions(
  adminId: number
): Promise<AdminPromotion[]> {
  const rows = await queryAll<any>(
    `SELECT ap.*, u.email FROM admin_promotions ap 
     LEFT JOIN users u ON ap.promoted_user_id = u.id 
     WHERE ap.promoted_by_admin_id = ? ORDER BY ap.promotion_timestamp_ms DESC`,
    [adminId]
  );
  return rows.map((row) => ({
    id: row.id,
    promotedUserId: row.promoted_user_id,
    promotedUsername: row.promoted_user_username,
    promotedUserEmail: row.promoted_user_email ?? row.email ?? null,
    promotedByAdminId: row.promoted_by_admin_id,
    promotedByAdminUsername: row.promoted_by_admin_username,
    promotionTimestampMs: row.promotion_timestamp_ms,
  }));
}

export async function recordAdminPromotion(
  promotedUserId: number,
  promotedUsername: string,
  promotedByAdminId: number,
  promotedByAdminUsername: string
): Promise<void> {
  const user = await queryOne<{ email: string }>(
    `SELECT email FROM users WHERE id = ?`,
    [promotedUserId]
  );

  await execSql(
    `INSERT INTO admin_promotions (promoted_user_id, promoted_user_username, promoted_user_email, promoted_by_admin_id, promoted_by_admin_username, promotion_timestamp_ms)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      promotedUserId,
      promotedUsername,
      user?.email ?? null,
      promotedByAdminId,
      promotedByAdminUsername,
      Date.now(),
    ]
  );
}

export async function getDeletedAssetsByAdmin(
  adminId: number
): Promise<DeletedAssetRecord[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM deleted_assets WHERE deleted_by_admin_id = ? ORDER BY deletion_timestamp_ms DESC`,
    [adminId]
  );
  return rows.map((row) => ({
    id: row.id,
    assetFilename: row.asset_filename,
    assetOriginalId: row.asset_original_id ?? null,
    originalUploaderId: row.original_uploader_id ?? null,
    originalUploaderUsername: row.original_uploader_username ?? null,
    imageBase64: row.image_base64 ?? null,
    mimeType: row.mime_type ?? null,
    deletedByAdminId: row.deleted_by_admin_id,
    deletedByAdminUsername: row.deleted_by_admin_username,
    deletionTimestampMs: row.deletion_timestamp_ms,
  }));
}

export async function getDeletedUsersByAdmin(
  adminId: number
): Promise<DeletedUserRecord[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM deleted_users WHERE deleted_by_admin_id = ? ORDER BY deletion_timestamp_ms DESC`,
    [adminId]
  );
  return rows.map((row) => ({
    id: row.id,
    deletedUserId: row.deleted_user_id,
    deletedUsername: row.deleted_username,
    deletedEmail: row.deleted_email,
    deletedRole: row.deleted_role,
    deletedByAdminId: row.deleted_by_admin_id,
    deletedByAdminUsername: row.deleted_by_admin_username,
    deletionTimestampMs: row.deletion_timestamp_ms,
  }));
}

export async function recordUserDeletion(
  deletedUserId: number,
  deletedUsername: string,
  deletedEmail: string,
  deletedRole: string,
  deletedByAdminId: number,
  deletedByAdminUsername: string
): Promise<void> {
  await execSql(
    `INSERT INTO deleted_users (deleted_user_id, deleted_username, deleted_email, deleted_role, deleted_by_admin_id, deleted_by_admin_username, deletion_timestamp_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      deletedUserId,
      deletedUsername,
      deletedEmail,
      deletedRole,
      deletedByAdminId,
      deletedByAdminUsername,
      Date.now(),
    ]
  );
}
