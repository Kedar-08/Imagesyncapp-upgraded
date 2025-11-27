# API Documentation - PhotoSync App

This document lists all API functions, endpoints, and database operations in the project, organized by their location and purpose.

## Table of Contents

- [Backend API Endpoints](#backend-api-endpoints)
- [Database Operations (SQLite)](#database-operations-sqlite)
- [Utility Functions](#utility-functions)
- [Service Layer](#service-layer)
- [React Hooks](#react-hooks)

---

## Backend API Endpoints

### Location: `src/utils/api.ts`

**Base URL Configuration:**

```typescript
const API_BASE = "https://example.com/api"; // ⚠️ TO BE REPLACED
const USE_MOCK = true; // ⚠️ Set to false for production
```

### 1. `uploadPhoto(asset: LocalAssetRecord): Promise<ServerUploadResponse>`

**Purpose:** Uploads a photo asset to the backend server with metadata.

**Endpoint:** `POST ${API_BASE}/assets/upload`

**Request Format:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Timeout: 30 seconds

**Request Body (FormData):**

```
file: Binary file data or base64
filename: string
mimeType: string (e.g., "image/jpeg")
timestamp: string (milliseconds)
latitude: string (optional)
longitude: string (optional)
```

**Response:**

```json
{
  "status": "ok" | "error",
  "serverId": "string"
}
```

**Current Behavior:**

- ✅ Mock mode: Simulates 2-second upload with generated server ID
- ⚠️ Real mode: Ready for backend integration (requires `USE_MOCK = false`)

**Error Handling:**

- Throws on network timeout (30s)
- Throws on HTTP errors (non-2xx responses)
- Abort controller for cancellation support

---

## Database Operations (SQLite)

### Location: `src/db/db.ts`

**Database Name:** `photosync.db`

### Asset Management APIs

#### 1. `initializeSchema(): Promise<void>`

**Purpose:** Creates or updates the SQLite database schema on app startup.

**Tables Created:**

- `assets` - Stores photo metadata and upload status
- `admin_promotions` - Audit trail for role changes
- `asset_deletions` - Audit trail for deleted assets

**Migrations:** Automatically adds missing columns (user_id, username)

---

#### 2. `insertAsset(params): Promise<number>`

**Purpose:** Adds a new photo asset to the local database.

**Parameters:**

```typescript
{
  filename: string,
  mimeType: string,
  timestampMs: number,
  imageBase64: string,
  uri?: string,
  latitude?: number,
  longitude?: number,
  fileSizeBytes?: number,
  userId?: number,
  username?: string
}
```

**Returns:** Asset ID (number)

**Status:** Automatically set to `"pending"` for upload queue

---

#### 3. `getAllAssets(): Promise<LocalAssetRecord[]>`

**Purpose:** Retrieves all photo assets from the database.

**Returns:** Array of asset records ordered by timestamp (newest first)

**Use Case:** Display all captured/uploaded photos in the app

---

#### 4. `getPendingAssets(limit: number): Promise<LocalAssetRecord[]>`

**Purpose:** Fetches assets waiting to be uploaded to the server.

**Parameters:**

- `limit` - Maximum number of assets to retrieve (default: 5)

**Returns:** Array of assets with status `"pending"` or `"failed"` (if retries < max)

**Use Case:** Queue manager processes these for upload

---

#### 5. `reservePendingAssets(ids: number[]): Promise<void>`

**Purpose:** Marks assets as actively uploading to prevent duplicate processing.

**Parameters:**

- `ids` - Array of asset IDs to reserve

**Status Update:** `"pending"` → `"uploading"`

---

#### 6. `markUploaded(id: number, serverId: string): Promise<void>`

**Purpose:** Updates asset status after successful upload to backend.

**Parameters:**

- `id` - Local asset ID
- `serverId` - Server-generated ID for correlation

**Status Update:** `"uploading"` → `"uploaded"`

**Stores:** Server ID for future reference

---

#### 7. `markFailed(id: number): Promise<void>`

**Purpose:** Marks an asset as permanently failed after max retries.

**Status Update:** Any status → `"failed"`

**Use Case:** User can manually retry from UI

---

#### 8. `setPending(id: number): Promise<void>`

**Purpose:** Resets asset status to retry upload.

**Status Update:** Any status → `"pending"`

**Use Case:** Manual retry button in UI

---

#### 9. `resetFailedAssets(): Promise<void>`

**Purpose:** Resets ALL failed assets to pending for bulk retry.

**Status Update:** All `"failed"` → `"pending"`, resets retry counter

**Use Case:** "Retry All" button in UI

---

#### 10. `resetAsset(id: number): Promise<void>`

**Purpose:** Resets a specific asset's retry counter and status.

**Updates:**

- Status → `"pending"`
- Retries → 0

**Use Case:** Individual asset retry

---

#### 11. `incrementRetryCapped(id: number, maxRetries: number): Promise<void>`

**Purpose:** Increments retry counter with automatic failure detection.

**Logic:**

- If retries < max: Increment and set to `"pending"`
- If retries >= max: Set to `"failed"`

**Parameters:**

- `id` - Asset ID
- `maxRetries` - Maximum retry attempts (typically 5)

---

#### 12. `deleteAsset(id: number, adminId: number, adminUsername: string): Promise<void>`

**Purpose:** Deletes an asset and records the deletion in audit trail.

**Audit Trail:** Stores who deleted the asset and when (admin_id, admin_username, timestamp)

**Use Case:** Admin/SuperAdmin asset management

---

#### 13. `getAllAssetsWithUsers(): Promise<AssetWithUser[]>`

**Purpose:** Retrieves all assets joined with user information.

**Returns:** Assets with associated user data (username, email, role)

**Use Case:** Admin dashboard showing who uploaded each asset

---

#### 14. `getAssetsByUserId(userId: number): Promise<LocalAssetRecord[]>`

**Purpose:** Fetches all assets uploaded by a specific user.

**Returns:** User's photo assets ordered by timestamp

**Use Case:** User profile view

---

#### 15. `getAdminPromotions(userId: number): Promise<AdminPromotion[]>`

**Purpose:** Retrieves audit trail of role changes for a user.

**Returns:** History of promotions/demotions with admin details and timestamps

**Use Case:** Admin audit trail display

---

#### 16. `getDeletedAssetsByAdmin(adminId: number): Promise<DeletedAsset[]>`

**Purpose:** Fetches assets deleted by a specific admin.

**Returns:** Deletion history with asset and user details

**Use Case:** SuperAdmin oversight of admin actions

---

#### 17. `recordAdminPromotion(params): Promise<void>`

**Purpose:** Records a role change in the audit trail.

**Parameters:**

```typescript
{
  userId: number,          // User being promoted/demoted
  oldRole: string,
  newRole: string,
  promotedBy: number,      // Admin making the change
  promotedByUsername: string
}
```

**Use Case:** Tracking admin permissions changes

---

### Location: `src/db/users.ts`

### User Management APIs

#### 18. `initializeUsersTable(): Promise<void>`

**Purpose:** Creates the users table schema.

**Table Structure:**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  createdAt TEXT,
  updatedAt TEXT
)
```

---

#### 19. `registerUser(email, username, password): Promise<StoredUser>`

**Purpose:** Creates a new user account.

**Password Security:** Hashes password with salt using SHA256

**Returns:** Created user object (without password hash)

**Validation:**

- Checks for duplicate email/username
- Auto-assigns role: `"user"`

**Use Case:** Signup flow

---

#### 20. `getUserByEmail(email: string): Promise<StoredUser | null>`

**Purpose:** Looks up user by email address.

**Returns:** User object or null if not found

**Use Case:** Login authentication, duplicate check

---

#### 21. `getUserByUsername(username: string): Promise<StoredUser | null>`

**Purpose:** Looks up user by username.

**Returns:** User object or null if not found

**Use Case:** Username availability check, profile lookup

---

#### 22. `getUserById(id: number): Promise<StoredUser | null>`

**Purpose:** Retrieves user by database ID.

**Returns:** User object or null

**Use Case:** User profile display, admin management

---

#### 23. `verifyPasswordHash(password: string, hash: string): Promise<boolean>`

**Purpose:** Verifies password against stored hash.

**Security:** Uses salt-based SHA256 hashing

**Returns:** `true` if password matches, `false` otherwise

**Use Case:** Login authentication

---

#### 24. `updateUserRole(userId: number, newRole: UserRole): Promise<StoredUser>`

**Purpose:** Changes a user's role/permissions.

**Roles:** `"user"` | `"admin"` | `"superadmin"`

**Returns:** Updated user object

**Use Case:** Admin promoting users, role management

---

#### 25. `getAllUsers(): Promise<StoredUser[]>`

**Purpose:** Retrieves all registered users.

**Returns:** Array of all users (excludes password hashes)

**Use Case:** Admin user management screen

---

#### 26. `deleteUser(userId: number): Promise<void>`

**Purpose:** Removes a user from the database.

**Cascading:** Also deletes user's assets

**Use Case:** SuperAdmin user management

---

#### 27. `createOrGetSuperAdmin(email: string, username: string): Promise<StoredUser>`

**Purpose:** Ensures SuperAdmin account exists with default credentials.

**Default Credentials:**

- Email: `kedar@superadmin.com`
- Password: `Superadmin123`

**Behavior:** Creates if not exists, returns existing if found

**Use Case:** First-time app setup, SuperAdmin login

---

## Utility Functions

### Location: `src/utils/dbHelpers.ts`

#### 28. `execSql<T>(sql: string, params: any[]): Promise<T>`

**Purpose:** Executes raw SQL queries on SQLite database.

**Returns:** Query result wrapped in Promise

**Use Case:** Generic database operations

---

#### 29. `queryOne<T>(sql: string, params: any[]): Promise<T | null>`

**Purpose:** Executes SELECT query and returns first row.

**Returns:** Single row or null if no results

**Use Case:** Fetch single record (e.g., user by email)

---

#### 30. `queryAll<T>(sql: string, params: any[]): Promise<T[]>`

**Purpose:** Executes SELECT query and returns all rows.

**Returns:** Array of rows

**Use Case:** Fetch multiple records (e.g., all users)

---

#### 31. `insertOne(sql: string, params: any[]): Promise<number>`

**Purpose:** Executes INSERT query and returns new row ID.

**Returns:** Last inserted row ID

**Use Case:** Create new records (users, assets)

---

#### 32. `hashPassword(password: string, salt?: string): Promise<string>`

**Purpose:** Hashes password with salt using SHA256.

**Algorithm:** `SHA256(salt + password)`

**Returns:** `"salt:hash"` string

**Use Case:** User registration, password storage

---

#### 33. `verifyPassword(password: string, hash: string): Promise<boolean>`

**Purpose:** Verifies password against stored hash.

**Returns:** `true` if match, `false` otherwise

**Use Case:** Login authentication

---

### Location: `src/utils/imageHelpers.ts`

#### 34. `compressImageToBase64(uri: string, quality: number): Promise<string>`

**Purpose:** Compresses and converts image to base64 string.

**Parameters:**

- `uri` - Image file URI
- `quality` - Compression quality (0.0 - 1.0)

**Returns:** Base64 encoded image string

**Use Case:** Reduce storage size before saving to SQLite

---

#### 35. `processAndQueueImage(uri: string, user: AuthUser, callback): Promise<void>`

**Purpose:** Complete image processing pipeline.

**Steps:**

1. Compress image to base64
2. Generate metadata (filename, timestamp)
3. Insert into local database
4. Trigger upload queue
5. Execute callback (UI refresh)

**Use Case:** Called after photo capture or gallery pick

---

### Location: `src/utils/tokenStorage.ts`

#### 36. `tokenStorage.saveToken(token: string): Promise<void>`

**Purpose:** Securely stores JWT token using Expo SecureStore.

**Storage:** Encrypted device storage

**Use Case:** Persist auth token after login

---

#### 37. `tokenStorage.getToken(): Promise<string | null>`

**Purpose:** Retrieves stored JWT token.

**Returns:** Token string or null if not found

**Use Case:** Check authentication status, API requests

---

#### 38. `tokenStorage.clearToken(): Promise<void>`

**Purpose:** Removes stored JWT token.

**Use Case:** Logout, token expiration

---

#### 39. `tokenStorage.saveUser(user: AuthUser): Promise<void>`

**Purpose:** Stores user profile data.

**Use Case:** Cache user info for offline access

---

#### 40. `tokenStorage.getUser(): Promise<AuthUser | null>`

**Purpose:** Retrieves cached user profile.

**Returns:** User object or null

**Use Case:** Restore session on app restart

---

#### 41. `tokenStorage.clearAll(): Promise<void>`

**Purpose:** Clears both token and user data.

**Use Case:** Complete logout

---

#### 42. `decodeToken(token: string): any`

**Purpose:** Decodes JWT token payload.

**Returns:** Token payload (user ID, role, expiration)

**Use Case:** Extract user info from token

---

#### 43. `isTokenExpired(token: string): boolean`

**Purpose:** Checks if JWT token has expired.

**Returns:** `true` if expired, `false` if valid

**Use Case:** Session validation

---

## Service Layer

### Location: `src/services/QueueManager.ts`

**Base URL Configuration:**

```typescript
const API_BASE_URL = "https://example.com"; // ⚠️ TO BE REPLACED
```

#### 44. `QueueManager.enqueue(assetId: number): Promise<void>`

**Purpose:** Adds asset to upload queue.

**Triggers:** Automatic upload processing

---

#### 45. `QueueManager.processQueue(): Promise<void>`

**Purpose:** Processes pending uploads with concurrency control.

**Limits:**

- Max concurrent uploads: 3
- Batch size: 5 assets
- Max retries: 5 with exponential backoff

**Behavior:**

- Checks network connectivity
- Reserves assets to prevent duplicates
- Handles upload failures and retries

---

#### 46. `QueueManager.pauseQueue(): void`

**Purpose:** Pauses upload processing.

**Use Case:** User preference, low battery mode

---

#### 47. `QueueManager.resumeQueue(): void`

**Purpose:** Resumes upload processing.

---

#### 48. `QueueManager.getMetrics(): Observable<QueueMetrics>`

**Purpose:** Streams real-time upload queue statistics.

**Metrics:**

```typescript
{
  totalQueued: number,
  inProgress: number,
  completed: number,
  failed: number,
  averageUploadTime: number,
  errorRate: number,
  lastSyncTime: number
}
```

**Use Case:** Queue status bar in UI

---

#### 49. `getQueueManager(): QueueManager`

**Purpose:** Singleton accessor for queue manager instance.

**Pattern:** Ensures single upload queue across app

---

### Location: `src/services/BackgroundSync.ts`

#### 50. `registerBackgroundSync(): Promise<void>`

**Purpose:** Registers background task for periodic uploads.

**Schedule:** Every 15 minutes (OS-dependent)

**Use Case:** Upload photos even when app is closed

---

#### 51. `unregisterBackgroundSync(): Promise<void>`

**Purpose:** Cancels background upload task.

**Use Case:** User preference, battery saving

---

### Location: `src/services/SyncEventBus.ts`

#### 52. `syncEventBus.emitAssetUploading(assetId, attempt): void`

**Purpose:** Broadcasts upload start event.

**Use Case:** UI loading indicators

---

#### 53. `syncEventBus.emitAssetUploaded(assetId, serverId): void`

**Purpose:** Broadcasts upload success event.

**Use Case:** UI success feedback, status updates

---

#### 54. `syncEventBus.emitAssetFailed(assetId, error, attempt): void`

**Purpose:** Broadcasts upload failure event.

**Use Case:** UI error messages, retry prompts

---

#### 55. `syncEventBus.onAssetUploading(): Observable<UploadingEvent>`

**Purpose:** Subscribes to upload start events.

**Returns:** RxJS Observable stream

---

#### 56. `syncEventBus.onAssetUploaded(): Observable<UploadedEvent>`

**Purpose:** Subscribes to upload success events.

---

#### 57. `syncEventBus.onAssetFailed(): Observable<FailedEvent>`

**Purpose:** Subscribes to upload failure events.

---

## React Hooks

### Location: `src/hooks/useAssets.ts`

#### 58. `useAssets(user, isAdmin, isSuperAdmin)`

**Purpose:** React hook for asset management with real-time updates.

**Returns:**

```typescript
{
  items: LocalAssetRecord[],
  syncingIds: Set<number>,
  failedIds: Set<number>,
  refreshing: boolean,
  onRefresh: () => Promise<void>,
  handleRetry: (id: number) => Promise<void>,
  handleDeleteAsset: (id: number) => Promise<void>
}
```

**Features:**

- Auto-refreshes on upload events
- Tracks syncing/failed states
- Provides retry and delete actions

---

### Location: `src/hooks/useUserManagement.ts`

#### 59. `useUserManagement(currentUser)`

**Purpose:** React hook for admin user management.

**Returns:**

```typescript
{
  users: StoredUser[],
  loading: boolean,
  handlePromoteUser: (userId, newRole) => Promise<void>,
  handleDeleteUser: (userId) => Promise<void>,
  refreshUsers: () => Promise<void>
}
```

**Features:**

- User list management
- Role promotion with audit trail
- User deletion (SuperAdmin only)

---

### Location: `src/hooks/useUserProfile.ts`

#### 60. `useUserProfile(user, currentUser)`

**Purpose:** React hook for user profile data.

**Returns:**

```typescript
{
  userAssets: LocalAssetRecord[],
  promotions: AdminPromotion[],
  deletions: DeletedAsset[],
  loading: boolean,
  refreshProfile: () => Promise<void>
}
```

**Features:**

- User's uploaded photos
- Role change history
- Admin action audit trail

---

## Authentication Context

### Location: `src/context/AuthContext.tsx`

#### 61. `AuthContext.login(email, password): Promise<void>`

**Purpose:** Authenticates user credentials.

**Current Behavior:**

- ⚠️ Validates against local SQLite database
- ⚠️ Generates mock JWT token
- ✅ Stores token securely
- ✅ Updates auth state

**Backend Integration Required:** Replace with real API call

---

#### 62. `AuthContext.signup(email, username, name, password): Promise<void>`

**Purpose:** Registers new user account.

**Current Behavior:**

- ⚠️ Creates user in local SQLite
- ⚠️ Generates mock JWT token
- ✅ Validates input with Yup schemas
- ✅ Hashes password securely

**Backend Integration Required:** Replace with real API call

---

#### 63. `AuthContext.logout(): Promise<void>`

**Purpose:** Signs user out of the app.

**Actions:**

- Clears secure storage
- Resets auth state
- Cancels upload queue

---

#### 64. `AuthContext.checkAuthStatus(): Promise<void>`

**Purpose:** Verifies stored token is still valid.

**Checks:**

- Token existence
- Token expiration
- Token signature (when using real backend)

---

## Summary

### API Endpoints (Backend Integration Required)

- ✅ 1 Upload endpoint ready: `POST /api/assets/upload`
- ⚠️ 2 Auth endpoints needed: `/auth/login`, `/auth/signup`

### Database Operations

- ✅ 27 SQLite functions for offline-first data management
- ✅ Full CRUD for users and assets
- ✅ Audit trail tracking

### Utility Functions

- ✅ 16 helper functions for encryption, compression, storage
- ✅ JWT token management
- ✅ Image processing pipeline

### Service Layer

- ✅ 14 queue management and background sync functions
- ✅ Event bus for real-time updates
- ✅ Retry logic with exponential backoff

### React Integration

- ✅ 7 custom hooks for state management
- ✅ Authentication context
- ✅ Real-time UI updates

---

## Configuration Changes Needed for Backend Integration

**Step 1:** Update API base URLs

```typescript
// src/utils/api.ts
const API_BASE = "https://your-backend.com/api";
const USE_MOCK = false;

// src/services/QueueManager.ts
const API_BASE_URL = "https://your-backend.com";
```

**Step 2:** Replace mock auth with real API calls in `src/context/AuthContext.tsx`

**Step 3:** Test with backend team's endpoints

**Step 4:** Deploy and monitor!

---

**Last Updated:** November 27, 2025  
**Project:** PhotoSync (expo-photosyncapp)  
**Status:** ✅ Ready for backend integration
