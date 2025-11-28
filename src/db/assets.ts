// Asset-related database operations
import type { LocalAssetRecord } from "../types";
import { execSql, queryAll, queryOne, insertOne } from "../utils/dbHelpers";
import type { AssetWithUser } from "./types";

function mapRow(r: any): LocalAssetRecord {
  return {
    id: r.id,
    filename: r.filename,
    mimeType: r.mime_type,
    timestampMs: r.timestamp_ms,
    status: r.status,
    retries: r.retries,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    imageBase64: r.image_base64,
    uri: r.uri ?? null,
    serverId: r.server_id ?? null,
    fileSizeBytes: r.file_size_bytes ?? null,
    userId: r.user_id ?? null,
    username: r.username ?? null,
  };
}

export async function insertAsset(params: {
  filename: string;
  mimeType: string;
  timestampMs: number;
  status: "pending" | "uploaded" | "failed";
  retries?: number;
  latitude?: number | null;
  longitude?: number | null;
  imageBase64: string;
  uri?: string | null;
  fileSizeBytes?: number;
  userId?: number | null;
  username?: string | null;
}): Promise<number> {
  return insertOne(
    `INSERT INTO assets (filename, mime_type, timestamp_ms, status, retries, latitude, longitude, image_base64, uri, file_size_bytes, user_id, username)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.filename,
      params.mimeType,
      params.timestampMs,
      params.status,
      params.retries ?? 0,
      params.latitude ?? null,
      params.longitude ?? null,
      params.imageBase64,
      params.uri ?? null,
      params.fileSizeBytes ?? null,
      params.userId ?? null,
      params.username ?? null,
    ]
  );
}

export async function getAllAssets(): Promise<LocalAssetRecord[]> {
  const rows = await queryAll<any>(`SELECT * FROM assets ORDER BY id DESC`);
  return rows.map(mapRow);
}

export async function getPendingAssets(limit = 5): Promise<LocalAssetRecord[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM assets WHERE status IN ('pending', 'failed') ORDER BY id ASC LIMIT ?`,
    [limit]
  );
  return rows.map(mapRow);
}

export async function reservePendingAssets(
  limit = 5
): Promise<LocalAssetRecord[]> {
  const sel = await queryAll<{ id: number }>(
    `SELECT id FROM assets WHERE status IN ('pending', 'failed') ORDER BY id ASC LIMIT ?`,
    [limit]
  );
  if (sel.length === 0) return [];

  const ids = sel.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");

  await execSql(
    `UPDATE assets SET status = 'uploading' WHERE id IN (${placeholders})`,
    ids
  );

  const rowsRes = await queryAll<any>(
    `SELECT * FROM assets WHERE id IN (${placeholders}) ORDER BY id ASC`,
    ids
  );
  return rowsRes.map(mapRow);
}

export async function markUploaded(
  id: number,
  serverId: string
): Promise<void> {
  await execSql(
    `UPDATE assets SET status = 'uploaded', server_id = ? WHERE id = ?`,
    [serverId, id]
  );
}

export async function incrementRetry(id: number): Promise<number> {
  await execSql(`UPDATE assets SET retries = retries + 1 WHERE id = ?`, [id]);
  const row = await queryOne<{ retries: number }>(
    `SELECT retries FROM assets WHERE id = ?`,
    [id]
  );
  return row?.retries ?? 0;
}

export async function incrementRetryCapped(
  id: number,
  maxRetries: number
): Promise<number> {
  const row = await queryOne<{ retries: number }>(
    `SELECT retries FROM assets WHERE id = ?`,
    [id]
  );
  const current = row?.retries ?? 0;
  if (current >= maxRetries) return current;
  await execSql(`UPDATE assets SET retries = ? WHERE id = ?`, [
    current + 1,
    id,
  ]);
  return current + 1;
}

export async function markFailed(id: number): Promise<void> {
  await execSql(`UPDATE assets SET status = 'failed' WHERE id = ?`, [id]);
}

export async function setPending(id: number): Promise<void> {
  await execSql(`UPDATE assets SET status = 'pending' WHERE id = ?`, [id]);
}

export async function resetFailedAssets(): Promise<void> {
  await execSql(
    `UPDATE assets SET status = 'pending', retries = 0 WHERE status = 'failed'`
  );
}

export async function resetAsset(id: number): Promise<void> {
  await execSql(
    `UPDATE assets SET status = 'pending', retries = 0 WHERE id = ?`,
    [id]
  );
}

export async function deleteAsset(
  id: number,
  deletedByAdminId?: number,
  deletedByAdminUsername?: string
): Promise<void> {
  if (deletedByAdminId && deletedByAdminUsername) {
    const asset = await queryOne<any>(
      `SELECT filename, user_id, username, image_base64, mime_type FROM assets WHERE id = ?`,
      [id]
    );

    if (asset) {
      await execSql(
        `INSERT INTO deleted_assets (asset_filename, asset_original_id, original_uploader_id, original_uploader_username, image_base64, mime_type, deleted_by_admin_id, deleted_by_admin_username, deletion_timestamp_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          asset.filename,
          id,
          asset.user_id ?? null,
          asset.username ?? null,
          asset.image_base64 || null,
          asset.mime_type || null,
          deletedByAdminId,
          deletedByAdminUsername,
          Date.now(),
        ]
      );
    }
  }

  await execSql(`DELETE FROM assets WHERE id = ?`, [id]);
}

export async function getAllAssetsWithUsers(): Promise<AssetWithUser[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM assets ORDER BY timestamp_ms DESC`
  );
  return rows.map((row) => ({
    ...mapRow(row),
    userId: row.user_id ?? null,
    username: row.username ?? null,
  }));
}

export async function getAssetsByUserId(
  userId: number
): Promise<AssetWithUser[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM assets WHERE user_id = ? ORDER BY timestamp_ms DESC`,
    [userId]
  );
  return rows.map((row) => ({
    ...mapRow(row),
    userId: row.user_id ?? null,
    username: row.username ?? null,
  }));
}
