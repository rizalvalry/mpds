/**
 * FileUploadItem Model
 * Represents a file in the upload queue with chunking capability
 */

export class FileUploadItem {
  constructor(data = {}) {
    this.file = data.file || null; // File object
    this.fileName = data.fileName || data.file?.name || '';
    this.fileSize = data.fileSize || data.file?.size || 0;
    this.fileId = data.fileId || `${Date.now()}_${this.fileName}`;
    this.progress = data.progress || 0;
    this.isUploading = data.isUploading || false;
    this.isUploaded = data.isUploaded || false;
    this.hasError = data.hasError || false;
    this.errorMessage = data.errorMessage || '';
    this.chunkSize = data.chunkSize || 512 * 1024; // 512KB chunks
    this.uploadedChunks = data.uploadedChunks || [];
    this.totalChunks = Math.ceil(this.fileSize / this.chunkSize);
    this.uri = data.uri || null;
    this.uploadedUrl = data.uploadedUrl || null;
  }

  static fromJson(json) {
    return new FileUploadItem(json);
  }

  toJson() {
    return {
      fileName: this.fileName,
      fileSize: this.fileSize,
      fileId: this.fileId,
      progress: this.progress,
      isUploaded: this.isUploaded,
      uploadedChunks: this.uploadedChunks,
      chunkSize: this.chunkSize,
      totalChunks: this.totalChunks,
      uploadedUrl: this.uploadedUrl,
    };
  }

  // Get chunks that haven't been uploaded yet
  getPendingChunks() {
    const allChunks = Array.from({ length: this.totalChunks }, (_, i) => i);
    return allChunks.filter((chunkIndex) => !this.uploadedChunks.includes(chunkIndex));
  }

  // Mark a chunk as uploaded
  markChunkUploaded(chunkIndex) {
    if (!this.uploadedChunks.includes(chunkIndex)) {
      this.uploadedChunks.push(chunkIndex);
    }
    this.progress = (this.uploadedChunks.length / this.totalChunks) * 100;
  }

  // Check if all chunks are uploaded
  isComplete() {
    return this.uploadedChunks.length === this.totalChunks;
  }

  // Get chunk data for a specific index
  async getChunkData(chunkIndex) {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.fileSize);

    if (this.file instanceof File || this.file instanceof Blob) {
      return this.file.slice(start, end);
    }

    return null;
  }

  // Reset upload state
  reset() {
    this.progress = 0;
    this.isUploading = false;
    this.isUploaded = false;
    this.hasError = false;
    this.errorMessage = '';
    this.uploadedChunks = [];
  }
}
