import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse";
import { insertFile } from "../db/db";
import type { AuthUser } from "../types";

const UPLOADS_DIR = `${FileSystem.documentDirectory}file_uploads/`;

// Ensure uploads directory exists
async function ensureUploadsDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(UPLOADS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(UPLOADS_DIR, { intermediates: true });
  }
}

// Pick document from device
export async function pickDocument(): Promise<DocumentPicker.DocumentPickerResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "text/csv",
      "text/comma-separated-values",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    copyToCacheDirectory: false,
  });

  return result;
}

// Parse CSV file for preview
async function parseCSV(uri: string): Promise<any[] | null> {
  try {
    const content = await FileSystem.readAsStringAsync(uri);
    const parsed = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      preview: 10, // Only parse first 10 rows for preview
    });

    if (parsed.errors.length > 0) {
      console.warn("CSV parsing warnings:", parsed.errors);
    }

    return parsed.data;
  } catch (error) {
    console.error("Error parsing CSV:", error);
    return null;
  }
}

// Save file and create database record
export async function saveAndRecordFile(
  pickerResult: DocumentPicker.DocumentPickerSuccessResult,
  user: AuthUser | null
): Promise<number> {
  await ensureUploadsDir();

  // Get first asset from result
  const asset = pickerResult.assets[0];
  if (!asset) {
    throw new Error("No file selected");
  }

  const timestamp = Date.now();
  const destFilename = `${timestamp}_${asset.name}`;
  const destUri = `${UPLOADS_DIR}${destFilename}`;

  // Copy file to app storage
  await FileSystem.copyAsync({
    from: asset.uri,
    to: destUri,
  });

  // Determine file type
  const isCSV =
    asset.mimeType?.includes("csv") ||
    asset.name.toLowerCase().endsWith(".csv");
  const fileType = isCSV ? "csv" : "excel";

  // Parse CSV for preview (optional)
  let parsedPreview: string | null = null;
  if (isCSV) {
    const parsed = await parseCSV(destUri);
    if (parsed && parsed.length > 0) {
      parsedPreview = JSON.stringify(parsed);
    }
  }

  // Insert into database
  const fileId = await insertFile({
    filename: asset.name,
    mimeType:
      asset.mimeType ||
      (isCSV
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    localUri: destUri,
    fileSizeBytes: asset.size || null,
    fileType,
    parsedPreview,
    status: "pending",
    userId: user ? parseInt(user.id, 10) : null,
    username: user?.username || null,
  });

  return fileId;
}

// Validate file before upload
export function validateFile(file: { size?: number; name: string }): {
  valid: boolean;
  error?: string;
} {
  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size && file.size > maxSize) {
    return {
      valid: false,
      error: "File size exceeds 50MB limit",
    };
  }

  // Check file extension
  const validExtensions = [".csv", ".xls", ".xlsx"];
  const hasValidExtension = validExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: "Invalid file type. Only CSV and Excel files are supported.",
    };
  }

  return { valid: true };
}

// Clean up file from filesystem
export async function deleteFileFromStorage(localUri: string): Promise<void> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }
  } catch (error) {
    console.error("Error deleting file from storage:", error);
  }
}
