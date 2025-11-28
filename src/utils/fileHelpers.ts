import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

/**
 * Open a file using the system's default application
 * @param localUri - The local file URI to open
 * @param filename - The filename for display purposes
 */
export async function openFile(
  localUri: string,
  filename: string
): Promise<void> {
  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      Alert.alert("Error", "File not found. It may have been deleted.");
      return;
    }

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Not Supported",
        "File sharing is not available on this device."
      );
      return;
    }

    // Share/open the file
    await Sharing.shareAsync(localUri, {
      UTI: getUTI(filename),
      mimeType: getMimeType(filename),
      dialogTitle: `Open ${filename}`,
    });
  } catch (error) {
    console.error("Error opening file:", error);
    Alert.alert("Error", "Failed to open file");
  }
}

/**
 * Get the UTI (Uniform Type Identifier) for iOS
 */
function getUTI(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "csv":
      return "public.comma-separated-values-text";
    case "xls":
      return "com.microsoft.excel.xls";
    case "xlsx":
      return "org.openxmlformats.spreadsheetml.sheet";
    default:
      return "public.data";
  }
}

/**
 * Get the MIME type for a file
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "csv":
      return "text/csv";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
}

/**
 * Copy a file to a temporary location for editing
 * Returns the new temporary file path
 */
export async function copyFileForEditing(
  localUri: string,
  filename: string
): Promise<string> {
  const tempDir = `${FileSystem.cacheDirectory}temp_edit/`;
  const tempDirInfo = await FileSystem.getInfoAsync(tempDir);

  if (!tempDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
  }

  const tempUri = `${tempDir}${Date.now()}_${filename}`;
  await FileSystem.copyAsync({
    from: localUri,
    to: tempUri,
  });

  return tempUri;
}
