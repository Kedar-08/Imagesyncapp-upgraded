import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { FileRecord } from "../db/db";
import { formatDate } from "../utils/dateHelpers";

interface FileItemProps {
  file: FileRecord;
  onRetry?: (id: number) => void;
  onDelete?: (id: number, filename: string) => void;
  onPress?: (file: FileRecord) => void;
  canDelete?: boolean;
}

export default function FileItem({
  file,
  onRetry,
  onDelete,
  onPress,
  canDelete,
}: FileItemProps) {
  const getStatusColor = () => {
    switch (file.status) {
      case "uploaded":
        return "#4CAF50";
      case "failed":
        return "#F44336";
      case "uploading":
        return "#2196F3";
      default:
        return "#FF9800";
    }
  };

  const getStatusText = () => {
    switch (file.status) {
      case "uploaded":
        return "Synced";
      case "failed":
        return "Failed";
      case "uploading":
        return "Uploading...";
      default:
        return "Pending";
    }
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(file)}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>
          {file.fileType === "csv" ? "CSV" : "XLS"}
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.filename} numberOfLines={1}>
          {file.filename}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {file.fileType.toUpperCase()} • {formatSize(file.fileSizeBytes)}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}
          >
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.timestampText}>{formatDate(file.timestampMs)}</Text>
        {file.username && (
          <Text style={styles.uploaderText}>Uploaded by: {file.username}</Text>
        )}
      </View>

      <View style={styles.actionsContainer}>
        {file.status === "failed" && onRetry && (
          <TouchableOpacity
            style={[styles.actionButton, styles.retryButton]}
            onPress={() => onRetry(file.id)}
          >
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
        {canDelete && onDelete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(file.id, file.filename)}
          >
            <MaterialIcons name="delete" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    marginRight: 12,
  },
  icon: {
    fontSize: 14,
    fontWeight: "700",
    color: "#757575",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  filename: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212121",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#757575",
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  timestampText: {
    fontSize: 11,
    color: "#9E9E9E",
    marginTop: 2,
  },
  uploaderText: {
    fontSize: 11,
    color: "#757575",
    marginTop: 2,
  },
  actionsContainer: {
    justifyContent: "center",
    marginLeft: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginVertical: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    backgroundColor: "#2196F3",
  },
  deleteButton: {
    backgroundColor: "#F44336",
    width: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
