/**
 * Storage abstraction layer.
 * Business logic depends on this interface, not directly on R2.
 * This makes it easier to swap storage providers or mock in tests.
 */

export {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteObject,
  objectExists,
  buildStorageKey,
} from "./r2";
