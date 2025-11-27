import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import type { StoredUser } from "../db/users";
import type { AuthUser } from "../types";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  ImageItem,
  PromotionItem,
  DeletionItem,
  DeletedUserItem,
} from "../components/UserProfileItems";
import {
  userProfileStyles,
  userCardStyles,
  profileModalStyles,
} from "../utils/styleHelpers";

interface UserProfileScreenProps {
  user: StoredUser;
  onBack: () => void;
  currentUser?: AuthUser | null;
}

export default function UserProfileScreen({
  user,
  onBack,
  currentUser,
}: UserProfileScreenProps) {
  const {
    images,
    promotions,
    deletions,
    deletedUsers,
    loading,
    refreshing,
    onRefresh,
  } = useUserProfile(user, currentUser || null);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const pStyles = userProfileStyles();
  const cStyles = userCardStyles();
  const mStyles = profileModalStyles();

  const handleImagePress = (item: any) => {
    setSelectedImage(item);
    setShowImageModal(true);
  };

  const isAdminUser = user.role !== "user";
  const canViewAdminActivity =
    currentUser &&
    (currentUser.role === "superadmin" ||
      (currentUser.role === "admin" && user.role === "superadmin") ||
      (currentUser.role === "admin" && user.role === "admin")) &&
    (user.role === "admin" || user.role === "superadmin");

  return (
    <View style={pStyles.container}>
      <View style={pStyles.header}>
        <TouchableOpacity onPress={onBack} style={pStyles.backButton}>
          <Text style={pStyles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={pStyles.title}>User Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={cStyles.card}>
        <View style={cStyles.info}>
          <Text style={cStyles.username}>{user.username}</Text>
          <Text style={cStyles.email}>{user.email}</Text>
          <View style={cStyles.roleContainer}>
            <Text
              style={[
                cStyles.role,
                user.role === "superadmin"
                  ? cStyles.roleSuperAdmin
                  : user.role === "admin"
                    ? cStyles.roleAdmin
                    : cStyles.roleUser,
              ]}
            >
              {user.role.toUpperCase()}
            </Text>
          </View>
        </View>
        {!isAdminUser && (
          <View style={cStyles.statsContainer}>
            <View style={cStyles.stat}>
              <Text style={cStyles.statNumber}>{images.length}</Text>
              <Text style={cStyles.statLabel}>Images</Text>
            </View>
          </View>
        )}
      </View>

      {!isAdminUser ? (
        <>
          <View style={pStyles.imagesHeader}>
            <Text style={pStyles.imagesTitle}>Uploaded Images</Text>
          </View>
          {loading && !refreshing ? (
            <View style={pStyles.centerContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : images.length === 0 ? (
            <View style={pStyles.centerContainer}>
              <Text style={pStyles.emptyText}>No images uploaded</Text>
            </View>
          ) : (
            <FlatList
              data={images}
              renderItem={({ item }) => (
                <ImageItem item={item} onPress={handleImagePress} />
              )}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={pStyles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          )}
        </>
      ) : canViewAdminActivity ? (
        <ScrollView
          contentContainerStyle={pStyles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {promotions.length > 0 && (
            <>
              <View style={pStyles.imagesHeader}>
                <Text style={pStyles.imagesTitle}>
                  Promotions by this{" "}
                  {user.role === "superadmin" ? "SuperAdmin" : "Admin"}
                </Text>
              </View>
              {promotions.map((item) => (
                <PromotionItem key={`promo-${item.id}`} item={item} />
              ))}
            </>
          )}
          {deletions.length > 0 && (
            <>
              <View style={pStyles.imagesHeader}>
                <Text style={pStyles.imagesTitle}>
                  Assets Deleted by this{" "}
                  {user.role === "superadmin" ? "SuperAdmin" : "Admin"}
                </Text>
              </View>
              {deletions.map((item) => (
                <DeletionItem key={`del-${item.id}`} item={item} />
              ))}
            </>
          )}
          {deletedUsers.length > 0 && (
            <>
              <View style={pStyles.imagesHeader}>
                <Text style={pStyles.imagesTitle}>
                  Users Removed by this{" "}
                  {user.role === "superadmin" ? "SuperAdmin" : "Admin"}
                </Text>
              </View>
              {deletedUsers.map((item) => (
                <DeletedUserItem key={`deluser-${item.id}`} item={item} />
              ))}
            </>
          )}
          {promotions.length === 0 &&
            deletions.length === 0 &&
            deletedUsers.length === 0 && (
              <View style={pStyles.centerContainer}>
                <Text style={pStyles.emptyText}>
                  No {user.role === "superadmin" ? "superadmin" : "admin"}{" "}
                  activity recorded
                </Text>
              </View>
            )}
        </ScrollView>
      ) : (
        <View style={pStyles.centerContainer}>
          <Text style={pStyles.emptyText}>
            {user.role === "admin"
              ? "Admins cannot upload images"
              : user.role === "superadmin"
                ? "SuperAdmins cannot upload images"
                : "Admin account"}
          </Text>
        </View>
      )}

      {showImageModal && selectedImage && (
        <View style={mStyles.modal}>
          <TouchableOpacity
            style={mStyles.modalOverlay}
            onPress={() => setShowImageModal(false)}
          >
            <View style={mStyles.modalContent}>
              <Image
                source={{
                  uri: `data:${selectedImage.mimeType};base64,${selectedImage.imageBase64}`,
                }}
                style={mStyles.modalImage}
                resizeMode="contain"
              />
              <View style={mStyles.modalInfo}>
                <Text style={mStyles.modalFilename} numberOfLines={2}>
                  {selectedImage.filename}
                </Text>
                <Text style={mStyles.modalDate}>
                  {new Date(selectedImage.timestampMs).toLocaleString()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
