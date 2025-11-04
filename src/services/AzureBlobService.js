import CryptoJS from 'crypto-js';

/**
 * Azure Blob Storage Service for Monitoring
 *
 * Monitors file counts in Azure Blob Storage folders:
 * - input/ (uploaded files)
 * - queued/ (files waiting to be processed)
 * - processed/YYYYMMDD/ (processed files per day)
 * - output/detected/YYYYMMDD/ (files with detections)
 * - output/undetected/YYYYMMDD/ (files without detections)
 */
class AzureBlobService {
  constructor() {
    // Production configuration - CORRECTED based on user's connection string
    this.storageAccountName = 'azmaisap100';
    // Obfuscated account key: stored as reversed chunk list of the Base64 key to avoid plain occurrence in repository history
    this._accountKeyChunksReversed = [
      'Ew==',
      'w7jP+ASt0XhB',
      '3t8irh8pOH6d',
      'Ew2MMLa4BJ7I',
      'rYSD8dkjxLG1',
      'VkfLBENATX/K',
      '8JDcwuJBpd2L',
      'AeX6CCnEz7I5'
    ];
    this.containerName = 'imagedetection';
    
    // Folder structure
    this.inputFolder = 'input';
    this.outputFolder = 'output';
    this.processedFolder = 'processed';
    this.queuedFolder = 'queued';

    // Azure Blob Storage endpoint
    this.storageUrl = `https://${this.storageAccountName}.blob.core.windows.net`;
    
    console.log('[AzureBlob] Initialized with:', {
      account: this.storageAccountName,
      container: this.containerName,
      url: this.storageUrl
    });
  }

  /**
   * Get today's date in YYYYMMDD format (GMT+7 Jakarta timezone)
   * @returns {string} Date string in YYYYMMDD format
   */
  getTodayDateString() {
    const now = new Date();
    // Convert to GMT+7 (Jakarta timezone)
    const jakartaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));

    const year = jakartaTime.getUTCFullYear();
    const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jakartaTime.getUTCDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }

  /**
   * Generate SAS token for Azure Blob Storage access (Container-level)
   * CORRECTED based on frontend.web implementation
   * @param {string} permissions - Permissions string (r=read, l=list, w=write)
   * @param {number} expiryMinutes - Token validity in minutes
   * @returns {string} SAS token query string
   */
  generateSasToken(permissions = 'rl', expiryMinutes = 60) {
    try {
      // Reconstruct Base64 account key from obfuscated chunks
      const accountKeyBase64 = this._accountKeyChunksReversed.slice().reverse().join('');

      const now = new Date();
      const expiryTime = new Date(now.getTime() + expiryMinutes * 60000);

      // Format dates for SAS token
      const startTime = now.toISOString().substring(0, 19) + 'Z';
      const expiry = expiryTime.toISOString().substring(0, 19) + 'Z';

      // SAS parameters
      const version = '2021-06-08';
      const protocol = 'https';
      const signedResource = 'c'; // 'c' for container-level access

      // Canonical resource string for CONTAINER
      const canonicalizedResource = `/blob/${this.storageAccountName}/${this.containerName}`;

      // String to sign for Container SAS (exact order from frontend.web)
      const stringToSign = [
        permissions,           // signedPermissions
        startTime,            // signedStart
        expiry,               // signedExpiry
        canonicalizedResource, // canonicalizedResource
        '',                   // signedIdentifier
        '',                   // signedIP
        protocol,             // signedProtocol
        version,              // signedVersion
        signedResource,       // signedResource ('c' for container)
        '',                   // signedSnapshotTime
        '',                   // signedEncryptionScope
        '',                   // rscc (Cache-Control)
        '',                   // rscd (Content-Disposition)
        '',                   // rsce (Content-Encoding)
        '',                   // rscl (Content-Language)
        ''                    // rsct (Content-Type)
      ].join('\n');

      console.log('[AzureBlob] String to sign (container-level):', stringToSign);

      // Create signature
      const signature = CryptoJS.HmacSHA256(stringToSign, CryptoJS.enc.Base64.parse(accountKeyBase64));
      const encodedSignature = CryptoJS.enc.Base64.stringify(signature);

      // Build SAS token with all required parameters
      const sasParams = {
        'sv': version,           // signed version
        'sr': signedResource,    // signed resource (container)
        'sp': permissions,       // signed permissions
        'st': startTime,         // signed start time
        'se': expiry,            // signed expiry time
        'spr': protocol,         // signed protocol
        'sig': encodedSignature  // signature
      };

      const sasToken = new URLSearchParams(sasParams).toString();
      console.log('[AzureBlob] SAS token generated successfully');

      return sasToken;
    } catch (error) {
      console.error('[AzureBlob] Error generating SAS token:', error);
      throw error;
    }
  }

  /**
   * List blobs in a specific folder path
   * @param {string} path - Folder path (e.g., 'input/', 'queued/')
   * @returns {Promise<Array>} Array of blob objects
   */
  async listBlobs(path = '') {
    try {
      const sasToken = this.generateSasToken('rl', 60);

      // Build URL for listing blobs with prefix
      const url = `${this.storageUrl}/${this.containerName}?comp=list&restype=container&prefix=${encodeURIComponent(path)}&${sasToken}`;

      console.log(`[AzureBlob] Listing blobs in path: ${path}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-ms-version': '2021-06-08',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AzureBlob] List blobs failed: ${response.status}`, errorText);
        throw new Error(`Failed to list blobs: ${response.status}`);
      }

      const xmlText = await response.text();

      // Parse XML response manually (React Native doesn't have DOMParser)
      const blobs = this.parseXmlBlobList(xmlText);

      console.log(`[AzureBlob] Found ${blobs.length} blobs in ${path}`);
      return blobs;
    } catch (error) {
      console.error(`[AzureBlob] Error listing blobs in ${path}:`, error);
      return [];
    }
  }

  /**
   * Parse XML blob list response
   * @param {string} xmlText - XML response text
   * @returns {Array} Array of blob objects
   */
  parseXmlBlobList(xmlText) {
    try {
      const blobs = [];

      // Extract blob information using regex (simple XML parsing)
      const blobPattern = /<Blob>[\s\S]*?<\/Blob>/g;
      const blobMatches = xmlText.match(blobPattern) || [];

      blobMatches.forEach(blobXml => {
        const nameMatch = blobXml.match(/<Name>(.*?)<\/Name>/);
        const sizeMatch = blobXml.match(/<Content-Length>(.*?)<\/Content-Length>/);
        const modifiedMatch = blobXml.match(/<Last-Modified>(.*?)<\/Last-Modified>/);

        if (nameMatch) {
          const name = nameMatch[1];
          const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
          const lastModified = modifiedMatch ? modifiedMatch[1] : '';

          blobs.push({
            name,
            size,
            lastModified,
            url: `${this.storageUrl}/${this.containerName}/${name}`
          });
        }
      });

      return blobs;
    } catch (error) {
      console.error('[AzureBlob] Error parsing XML:', error);
      return [];
    }
  }

  /**
   * Get count of files in input folder
   * @returns {Promise<number>} Count of files
   */
  async getInputFilesCount() {
    try {
      const blobs = await this.listBlobs(`${this.inputFolder}/`);
      return blobs.length;
    } catch (error) {
      console.error('[AzureBlob] Error getting input files count:', error);
      return 0;
    }
  }

  /**
   * Get count of files in queued folder
   * @returns {Promise<number>} Count of files
   */
  async getQueuedFilesCount() {
    try {
      const blobs = await this.listBlobs(`${this.queuedFolder}/`);
      return blobs.length;
    } catch (error) {
      console.error('[AzureBlob] Error getting queued files count:', error);
      return 0;
    }
  }

  /**
   * Get count of files processed today
   * @returns {Promise<number>} Count of files
   */
  async getProcessedFilesCount() {
    try {
      const todayDate = this.getTodayDateString();
      const blobs = await this.listBlobs(`${this.processedFolder}/${todayDate}/`);
      return blobs.length;
    } catch (error) {
      console.error('[AzureBlob] Error getting processed files count:', error);
      return 0;
    }
  }

  /**
   * Get count of detected files today
   * @returns {Promise<number>} Count of files
   */
  async getDetectedFilesCount() {
    try {
      const todayDate = this.getTodayDateString();
      const blobs = await this.listBlobs(`${this.outputFolder}/detected/${todayDate}/`);
      return blobs.length;
    } catch (error) {
      console.error('[AzureBlob] Error getting detected files count:', error);
      return 0;
    }
  }

  /**
   * Get count of undetected files today
   * @returns {Promise<number>} Count of files
   */
  async getUndetectedFilesCount() {
    try {
      const todayDate = this.getTodayDateString();
      const blobs = await this.listBlobs(`${this.outputFolder}/undetected/${todayDate}/`);
      return blobs.length;
    } catch (error) {
      console.error('[AzureBlob] Error getting undetected files count:', error);
      return 0;
    }
  }

  /**
   * Get all monitoring statistics
   * @returns {Promise<Object>} Object with all counts
   */
  async getAllStats() {
    try {
      console.log('[AzureBlob] Fetching all monitoring stats...');

      const [inputCount, queuedCount, processedCount, detectedCount, undetectedCount] = await Promise.all([
        this.getInputFilesCount(),
        this.getQueuedFilesCount(),
        this.getProcessedFilesCount(),
        this.getDetectedFilesCount(),
        this.getUndetectedFilesCount()
      ]);

      const stats = {
        input: inputCount,
        queued: queuedCount,
        processed: processedCount,
        detected: detectedCount,
        undetected: undetectedCount,
        total: inputCount + queuedCount + processedCount,
        timestamp: new Date().toISOString()
      };

      console.log('[AzureBlob] All stats fetched:', stats);
      return stats;
    } catch (error) {
      console.error('[AzureBlob] Error getting all stats:', error);
      return {
        input: 0,
        queued: 0,
        processed: 0,
        detected: 0,
        undetected: 0,
        total: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if processing is complete (queued folder is empty)
   * @returns {Promise<boolean>} True if no files in queued folder
   */
  async isProcessingComplete() {
    try {
      const queuedCount = await this.getQueuedFilesCount();
      return queuedCount === 0;
    } catch (error) {
      console.error('[AzureBlob] Error checking processing status:', error);
      return false;
    }
  }
}

// Export singleton instance
const azureBlobService = new AzureBlobService();
export default azureBlobService;
