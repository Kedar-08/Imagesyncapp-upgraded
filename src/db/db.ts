import { execSql } from "../utils/dbHelpers";

// Re-export all database types
export type {
  AssetWithUser,
  AdminPromotion,
  DeletedAssetRecord,
  DeletedUserRecord,
  FileRecord,
} from "./types";

// Re-export all asset operations
export {
  insertAsset,
  getAllAssets,
  getPendingAssets,
  reservePendingAssets,
  markUploaded,
  incrementRetry,
  incrementRetryCapped,
  markFailed,
  setPending,
  resetFailedAssets,
  resetAsset,
  deleteAsset,
  getAllAssetsWithUsers,
  getAssetsByUserId,
} from "./assets";

// Re-export all file operations
export {
  insertFile,
  getAllFiles,
  getPendingFiles,
  markFileUploaded,
  markFileFailed,
  setFilePending,
  markFileUploading,
  incrementFileRetry,
  resetFailedFiles,
  deleteFile,
  getFilesByUserId,
} from "./files";

// Re-export all admin operations
export {
  getAdminPromotions,
  recordAdminPromotion,
  getDeletedAssetsByAdmin,
  getDeletedUsersByAdmin,
  recordUserDeletion,
} from "./admin";

/**
 * Initialize all database tables
 * This must be called once at app startup
 */
export async function initializeSchema(): Promise<void> {
  await execSql(
    `CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      status TEXT NOT NULL,
      retries INTEGER NOT NULL DEFAULT 0,
      latitude REAL,
      longitude REAL,
      image_base64 TEXT NOT NULL,
      uri TEXT,
      server_id TEXT,
      file_size_bytes INTEGER,
      user_id INTEGER,
      username TEXT
    )`
  );

  // Migration: Add user_id and username columns if they don't exist
  try {
    await execSql(`ALTER TABLE assets ADD COLUMN user_id INTEGER`);
  } catch (err) {
    // Column already exists, ignore error
  }

  try {
    await execSql(`ALTER TABLE assets ADD COLUMN username TEXT`);
  } catch (err) {
    // Column already exists, ignore error
  }

  // Migration: Clear invalid server IDs from previous mock versions
  // (e.g., "local_1_", "server_1_timestamp", etc.)
  try {
    await execSql(
      `UPDATE assets SET server_id = NULL WHERE server_id LIKE 'local_%' OR server_id LIKE 'server_%'`
    );
  } catch (err) {
    // Ignore if column doesn't exist yet
  }

  // Create admin_promotions table for tracking who promoted which users
  await execSql(
    `CREATE TABLE IF NOT EXISTS admin_promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      promoted_user_id INTEGER NOT NULL,
      promoted_user_username TEXT NOT NULL,
      promoted_user_email TEXT,
      promoted_by_admin_id INTEGER NOT NULL,
      promoted_by_admin_username TEXT NOT NULL,
      promotion_timestamp_ms INTEGER NOT NULL
    )`
  );

  // Migration: Add email column to admin_promotions if it doesn't exist
  try {
    await execSql(
      `ALTER TABLE admin_promotions ADD COLUMN promoted_user_email TEXT`
    );
  } catch (err) {
    // Column already exists, ignore error
  }

  // Create deleted_assets table for tracking deleted images
  await execSql(
    `CREATE TABLE IF NOT EXISTS deleted_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_filename TEXT NOT NULL,
      asset_original_id INTEGER,
      original_uploader_id INTEGER,
      original_uploader_username TEXT,
      image_base64 TEXT,
      mime_type TEXT,
      deleted_by_admin_id INTEGER NOT NULL,
      deleted_by_admin_username TEXT NOT NULL,
      deletion_timestamp_ms INTEGER NOT NULL
    )`
  );

  // Create deleted_users table for tracking removed users
  await execSql(
    `CREATE TABLE IF NOT EXISTS deleted_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deleted_user_id INTEGER NOT NULL,
      deleted_username TEXT NOT NULL,
      deleted_email TEXT NOT NULL,
      deleted_role TEXT NOT NULL,
      deleted_by_admin_id INTEGER NOT NULL,
      deleted_by_admin_username TEXT NOT NULL,
      deletion_timestamp_ms INTEGER NOT NULL
    )`
  );

  // Create files table for CSV/Excel document management
  await execSql(
    `CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      file_size_bytes INTEGER,
      file_type TEXT NOT NULL,
      parsed_preview TEXT,
      status TEXT NOT NULL,
      retries INTEGER NOT NULL DEFAULT 0,
      timestamp_ms INTEGER NOT NULL,
      server_id TEXT,
      user_id INTEGER,
      username TEXT
    )`
  );

  try {
    await execSql(`ALTER TABLE deleted_assets ADD COLUMN image_base64 TEXT`);
  } catch (err) {
    // Column already exists
  }

  try {
    await execSql(`ALTER TABLE deleted_assets ADD COLUMN mime_type TEXT`);
  } catch (err) {
    // Column already exists
  }
}
