// File (CSV/Excel) related database operations
import { execSql, queryAll, queryOne, insertOne } from "../utils/dbHelpers";
import type { FileRecord } from "./types";

function mapFileRow(row: any): FileRecord {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mime_type,
    localUri: row.local_uri,
    fileSizeBytes: row.file_size_bytes ?? null,
    fileType: row.file_type,
    parsedPreview: row.parsed_preview ?? null,
    status: row.status as "pending" | "uploaded" | "failed" | "uploading",
    retries: row.retries ?? 0,
    timestampMs: row.timestamp_ms,
    serverId: row.server_id ?? null,
    userId: row.user_id ?? null,
    username: row.username ?? null,
  };
}

export async function insertFile(params: {
  filename: string;
  mimeType: string;
  localUri: string;
  fileSizeBytes?: number | null;
  fileType: string;
  parsedPreview?: string | null;
  status?: "pending" | "uploaded" | "failed";
  userId?: number | null;
  username?: string | null;
}): Promise<number> {
  return insertOne(
    `INSERT INTO files (filename, mime_type, local_uri, file_size_bytes, file_type, parsed_preview, status, retries, timestamp_ms, user_id, username)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.filename,
      params.mimeType,
      params.localUri,
      params.fileSizeBytes ?? null,
      params.fileType,
      params.parsedPreview ?? null,
      params.status ?? "pending",
      0,
      Date.now(),
      params.userId ?? null,
      params.username ?? null,
    ]
  );
}

export async function getAllFiles(): Promise<FileRecord[]> {
  const rows = await queryAll<any>(`SELECT * FROM files ORDER BY id DESC`);
  return rows.map(mapFileRow);
}

export async function getPendingFiles(limit = 5): Promise<FileRecord[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM files WHERE status IN ('pending', 'failed') AND retries < 5 ORDER BY id ASC LIMIT ?`,
    [limit]
  );
  return rows.map(mapFileRow);
}

export async function markFileUploaded(
  id: number,
  serverId: string
): Promise<void> {
  await execSql(
    `UPDATE files SET status = 'uploaded', server_id = ? WHERE id = ?`,
    [serverId, id]
  );
}

export async function markFileFailed(id: number): Promise<void> {
  await execSql(`UPDATE files SET status = 'failed' WHERE id = ?`, [id]);
}

export async function setFilePending(id: number): Promise<void> {
  await execSql(`UPDATE files SET status = 'pending' WHERE id = ?`, [id]);
}

export async function markFileUploading(id: number): Promise<void> {
  await execSql(`UPDATE files SET status = 'uploading' WHERE id = ?`, [id]);
}

export async function incrementFileRetry(
  id: number,
  maxRetries = 5
): Promise<void> {
  await execSql(`UPDATE files SET retries = retries + 1 WHERE id = ?`, [id]);

  const file = await queryOne<{ retries: number }>(
    `SELECT retries FROM files WHERE id = ?`,
    [id]
  );

  if (file && file.retries >= maxRetries) {
    await markFileFailed(id);
  } else {
    await setFilePending(id);
  }
}

export async function resetFailedFiles(): Promise<void> {
  await execSql(
    `UPDATE files SET status = 'pending', retries = 0 WHERE status = 'failed'`
  );
}

export async function deleteFile(
  id: number,
  deletedByAdminId?: number,
  deletedByAdminUsername?: string
): Promise<void> {
  if (deletedByAdminId && deletedByAdminUsername) {
    const file = await queryOne<any>(`SELECT * FROM files WHERE id = ?`, [id]);
    if (file) {
      // Could add a deleted_files table similar to deleted_assets if needed
    }
  }

  await execSql(`DELETE FROM files WHERE id = ?`, [id]);
}

export async function getFilesByUserId(userId: number): Promise<FileRecord[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM files WHERE user_id = ? ORDER BY timestamp_ms DESC`,
    [userId]
  );
  return rows.map(mapFileRow);
}
