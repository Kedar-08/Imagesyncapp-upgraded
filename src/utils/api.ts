import { LocalAssetRecord, ServerUploadResponse } from "../types";
import type { FileRecord } from "../db/db";

const API_BASE = "https://example.com/api"; // TODO: replace with actual backend
const UPLOAD_TIMEOUT = 30000; // 30 seconds
const USE_MOCK = true; // Set to false when you have a real backend

export async function uploadPhoto(
  asset: LocalAssetRecord
): Promise<ServerUploadResponse> {
  // Mock mode for testing - simulates successful upload
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 2000)); // Simulate 2 second upload
    // Generate a realistic server ID (like a UUID or server-generated ID)
    const mockServerId = `srv${Math.random().toString(36).substring(2, 10)}`;
    return {
      status: "ok",
      serverId: mockServerId,
    };
  }

  // Real upload with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

  try {
    const form = new FormData();

    // Use URI if available, otherwise use base64
    if (asset.uri && asset.uri.length > 0) {
      const file: any = {
        uri: asset.uri,
        name: asset.filename,
        type: asset.mimeType,
      };
      form.append("file", file as any);
    } else {
      const file: any = {
        name: asset.filename,
        type: asset.mimeType,
        data: asset.imageBase64,
      };
      form.append("file", file as any);
    }

    form.append("filename", asset.filename);
    form.append("mimeType", asset.mimeType);
    form.append("timestamp", String(asset.timestampMs));
    form.append(
      "latitude",
      asset.latitude != null ? String(asset.latitude) : ""
    );
    form.append(
      "longitude",
      asset.longitude != null ? String(asset.longitude) : ""
    );

    const response = await fetch(`${API_BASE}/assets/upload`, {
      method: "POST",
      body: form as any,
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const json = await response.json();
    return json as ServerUploadResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Upload timeout - please check your connection");
    }
    throw error;
  }
}

export async function uploadFile(
  file: FileRecord
): Promise<ServerUploadResponse> {
  // Mock mode for testing - simulates successful upload
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 2000)); // Simulate 2 second upload
    // Generate a realistic server ID
    const mockServerId = `file_${Math.random().toString(36).substring(2, 10)}`;
    return {
      status: "ok",
      serverId: mockServerId,
    };
  }

  // Real upload with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

  try {
    const form = new FormData();

    // Attach file from local URI
    const fileObj: any = {
      uri: file.localUri,
      name: file.filename,
      type: file.mimeType,
    };
    form.append("file", fileObj as any);

    form.append("filename", file.filename);
    form.append("mimeType", file.mimeType);
    form.append("fileType", file.fileType);
    form.append("timestamp", String(file.timestampMs));
    if (file.fileSizeBytes) {
      form.append("fileSize", String(file.fileSizeBytes));
    }

    const response = await fetch(`${API_BASE}/files/upload`, {
      method: "POST",
      body: form as any,
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.status}`);
    }

    const json = await response.json();
    return json as ServerUploadResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Upload timeout - please check your connection");
    }
    throw error;
  }
}
