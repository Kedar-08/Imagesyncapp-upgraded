import React, { useCallback, useState } from "react";
import { View, FlatList, StyleSheet, Alert, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { LocalAssetRecord } from "../types";
import { useAuth } from "../context/AuthContext";
import { processAndQueueImage } from "../utils/imageHelpers";
import {
  pickDocument,
  saveAndRecordFile,
  validateFile,
} from "../services/FileService";
import { getQueueManager } from "../services/QueueManager";
import AssetItem from "../components/AssetItem";
import ZoomModal from "../components/ZoomModal";
import CameraModal from "../components/CameraModal";
import CaptureHeader from "../components/CaptureHeader";
import { useAssets } from "../hooks/useAssets";
import { useFiles } from "../hooks/useFiles";
import FileItem from "../components/FileItem";
import { openFile } from "../utils/fileHelpers";
import type { FileRecord } from "../db/db";

interface CaptureScreenProps {
  onNavigateToUsers?: () => void;
  onNavigateToAssets?: () => void;
  currentScreen?: "capture" | "users" | "assets";
}

export default function CaptureScreen({
  onNavigateToUsers,
  onNavigateToAssets,
  currentScreen,
}: CaptureScreenProps) {
  const { logout, user, isAdmin, isSuperAdmin, isUser } = useAuth();
  const {
    items,
    syncingIds,
    failedIds,
    refreshing,
    onRefresh,
    handleRetry,
    handleDeleteAsset,
  } = useAssets(user, isAdmin, isSuperAdmin);

  const {
    files,
    refreshing: filesRefreshing,
    onRefresh: onRefreshFiles,
    handleRetryFile,
    handleDeleteFile,
  } = useFiles(user, isAdmin, isSuperAdmin);

  const [showCamera, setShowCamera] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LocalAssetRecord | null>(
    null
  );

  const formatDate = (timestampMs: number) => {
    const date = new Date(timestampMs);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePickerResult = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled || !result.assets || result.assets.length === 0)
        return;

      const asset = result.assets[0];
      const uri = asset.uri;

      try {
        await processAndQueueImage(uri, user, async () => {
          await onRefresh();
        });
      } catch (error) {
        console.error("Error processing image:", error);
      }
    },
    [onRefresh, user]
  );

  const handleCapture = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        console.log("Camera permission denied");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        quality: 0.6,
        allowsEditing: false,
      });

      await handlePickerResult(result);
    } catch (error) {
      console.error("Camera error:", error);
    }
  }, [handlePickerResult]);

  const handlePick = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    await handlePickerResult(result);
  }, [handlePickerResult]);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await pickDocument();

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      // Validate file
      const validation = validateFile({
        size: asset.size,
        name: asset.name,
      });

      if (!validation.valid) {
        Alert.alert(
          "Invalid File",
          validation.error || "Please select a valid CSV or Excel file"
        );
        return;
      }

      // Save and record file
      const fileId = await saveAndRecordFile(result, user);

      // Enqueue for upload
      const queueManager = getQueueManager();
      await queueManager.enqueueFile(fileId);

      // Refresh file list
      await onRefreshFiles();

      Alert.alert("Success", "File uploaded successfully and queued for sync");
    } catch (error) {
      console.error("File picker error:", error);
      Alert.alert("Error", "Failed to upload file");
    }
  }, [user, onRefreshFiles]);

  const handleCameraCapture = useCallback(
    async (cameraRef: any) => {
      try {
        const photo = await cameraRef.takePictureAsync({ quality: 0.5 });
        if (photo?.uri) {
          await processAndQueueImage(photo.uri, user, async () => {
            await onRefresh();
          });
        }
      } catch (err: any) {
        console.warn("takePictureAsync error", err);
      }
    },
    [onRefresh, user]
  );

  const handleOpenFile = useCallback(
    async (file: FileRecord) => {
      if (!file.localUri) {
        Alert.alert("Error", "File path not found");
        return;
      }

      Alert.alert(
        "File Options",
        `What would you like to do with ${file.filename}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "View/Edit",
            onPress: async () => {
              await openFile(file.localUri, file.filename);

              // After opening, offer to re-upload if edited
              setTimeout(() => {
                Alert.alert(
                  "Re-upload File?",
                  "If you made changes to the file, you can upload a new version.",
                  [
                    { text: "No, Thanks", style: "cancel" },
                    {
                      text: "Upload New Version",
                      onPress: async () => {
                        await handlePickFile();
                      },
                    },
                  ]
                );
              }, 2000);
            },
          },
        ]
      );
    },
    [handlePickFile]
  );

  return (
    <View style={styles.container}>
      <CaptureHeader
        user={user}
        isUser={isUser}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        currentScreen={currentScreen}
        onLogout={logout}
        onNavigateToUsers={onNavigateToUsers}
        onNavigateToAssets={onNavigateToAssets}
        onCapture={handleCapture}
        onPick={handlePick}
        onPickFile={handlePickFile}
      />

      {/* Images Section */}
      {items.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Images ({items.length})</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => {
          const isSyncing = syncingIds.has(item.id);
          const isFailed = failedIds.has(item.id);
          return (
            <AssetItem
              item={item}
              isUser={isUser}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              isSyncing={isSyncing}
              isFailed={isFailed}
              onZoom={(it) => {
                setSelectedImage(it);
                setShowZoom(true);
              }}
              onRetry={handleRetry}
              onDelete={handleDeleteAsset}
              formatDate={formatDate}
            />
          );
        }}
        ListFooterComponent={
          files.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Files ({files.length})</Text>
              </View>
              {files.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  onPress={handleOpenFile}
                  onRetry={handleRetryFile}
                  onDelete={handleDeleteFile}
                  canDelete={
                    isAdmin ||
                    isSuperAdmin ||
                    file.userId === parseInt(user?.id || "0", 10)
                  }
                />
              ))}
            </>
          ) : null
        }
      />

      <CameraModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />

      <ZoomModal
        visible={showZoom}
        image={selectedImage}
        onClose={() => setShowZoom(false)}
        formatDate={formatDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  sectionHeader: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#424242",
  },
});
