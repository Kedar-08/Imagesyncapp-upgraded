/**
 * Database helper utilities to reduce code duplication.
 * Consolidates common transaction/promise patterns and crypto utilities.
 */
import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";

const db = SQLite.openDatabaseSync("photosync.db");

/**
 * Execute a SQL query and return the result wrapped in a promise.
 */
export function execSql<T = any>(sql: string, params: any[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const result = db.runSync(sql, params);
      resolve(result as unknown as T);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Execute a SELECT query and return the first row or null.
 */
export async function queryOne<T>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  try {
    const result = db.getFirstSync<T>(sql, params);
    return result || null;
  } catch (err) {
    throw err;
  }
}

/**
 * Execute a SELECT query and return all rows.
 */
export async function queryAll<T>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  try {
    const result = db.getAllSync<T>(sql, params);
    return result;
  } catch (err) {
    throw err;
  }
}

/**
 * Execute an INSERT and return the inserted ID.
 */
export async function insertOne(
  sql: string,
  params: any[] = []
): Promise<number> {
  try {
    const result = db.runSync(sql, params);
    return result.lastInsertRowId || 0;
  } catch (err) {
    throw err;
  }
}

/**
 * Hash a password with SHA256 and salt
 */
export const hashPassword = async (
  password: string,
  salt?: string
): Promise<string> => {
  const saltValue = salt || Crypto.randomUUID();
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltValue + password
  );
  return `${saltValue}:${hash}`;
};

/**
 * Verify a password against a hash
 */
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const [salt] = hash.split(":");
  const newHash = await hashPassword(password, salt);
  return newHash === hash;
};
