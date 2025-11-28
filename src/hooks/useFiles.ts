import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import {
  getAllFiles,
  initializeSchema,
  setFilePending,
  deleteFile,
  getPendingFiles,
} from "../db/db";
import type { FileRecord } from "../db/db";
import type { AuthUser } from "../types";
import { syncEventBus } from "../services/SyncEventBus";

interface UseFilesReturn {
  files: FileRecord[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  handleRetryFile: (id: number) => Promise<void>;
  handleDeleteFile: (fileId: number, filename: string) => Promise<void>;
}

export function useFiles(
  user: AuthUser | null,
  isAdmin: boolean,
  isSuperAdmin: boolean
): UseFilesReturn {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const allFiles = await getAllFiles();
      setFiles(allFiles);
    } catch (error) {
      console.error("Error loading files:", error);
    }
  }, []);

  // Retry failed file upload
  const handleRetryFile = useCallback(
    async (fileId: number) => {
      try {
        await setFilePending(fileId);
        await reload();
        // Trigger queue processing here if needed
      } catch (error) {
        console.error("Error retrying file:", error);
        throw error;
      }
    },
    [reload]
  );

  // Delete file (with admin tracking if applicable)
  const handleDeleteFile = useCallback(
    async (fileId: number, filename: string) => {
      Alert.alert(
        "Delete File",
        `Are you sure you want to delete "${filename}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            onPress: async () => {
              try {
                if ((isAdmin || isSuperAdmin) && user) {
                  await deleteFile(
                    fileId,
                    parseInt(user.id, 10),
                    user.username
                  );
                } else {
                  await deleteFile(fileId);
                }
                await reload();
              } catch (error) {
                console.error("Error deleting file:", error);
                Alert.alert("Error", "Failed to delete file");
              }
            },
            style: "destructive",
          },
        ]
      );
    },
    [reload, isAdmin, isSuperAdmin, user]
  );

  // Initialize and load files
  useEffect(() => {
    void (async () => {
      setLoading(true);
      await initializeSchema();
      await reload();
      setLoading(false);
    })();

    // Listen for file sync events to update status in real-time
    const handleFileUploading = () => reload();
    const handleFileUploaded = () => reload();
    const handleFileFailed = () => reload();

    syncEventBus.onSyncEvent("file:uploading", handleFileUploading);
    syncEventBus.onSyncEvent("file:uploaded", handleFileUploaded);
    syncEventBus.onSyncEvent("file:failed", handleFileFailed);

    return () => {
      syncEventBus.offSyncEvent("file:uploading", handleFileUploading);
      syncEventBus.offSyncEvent("file:uploaded", handleFileUploaded);
      syncEventBus.offSyncEvent("file:failed", handleFileFailed);
    };
  }, [reload]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  return {
    files,
    loading,
    refreshing,
    onRefresh,
    handleRetryFile,
    handleDeleteFile,
  };
}
