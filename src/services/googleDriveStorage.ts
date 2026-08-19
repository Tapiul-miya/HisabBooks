import { getAccessToken } from './googleAuth';
import { HisabStorage } from '../data/storage';

export interface DriveBackupFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime?: string;
  description?: string;
}

const BACKUP_FOLDER_NAME = 'HisabBook_Cloud_Backups';
const AUTO_BACKUP_KEY = 'hisabbook_auto_cloud_backup_enabled';
const LAST_CLOUD_BACKUP_KEY = 'hisabbook_last_cloud_backup_time';

export const isAutoBackupEnabled = (): boolean => {
  try {
    return localStorage.getItem(AUTO_BACKUP_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setAutoBackupEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(AUTO_BACKUP_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save auto backup setting:', e);
  }
};

export const getLastCloudBackupTime = (): string | null => {
  try {
    return localStorage.getItem(LAST_CLOUD_BACKUP_KEY);
  } catch {
    return null;
  }
};

export const setLastCloudBackupTime = (timeStr: string): void => {
  try {
    localStorage.setItem(LAST_CLOUD_BACKUP_KEY, timeStr);
  } catch (e) {
    console.error('Failed to set last backup time:', e);
  }
};

/**
 * Finds or creates the dedicated backup folder in Google Drive
 */
export const ensureBackupFolder = async (token: string): Promise<string> => {
  const query = encodeURIComponent(
    `name = '${BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!searchRes.ok) {
    throw new Error(`গুগল ড্রাইভ ফোল্ডার খুঁজতে ত্রুটি: ${searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'হিসাব খাতা অটোমেটিক ক্লাউড ব্যাকআপ ফোল্ডার'
    })
  });

  if (!createRes.ok) {
    throw new Error(`ক্লাউড ব্যাকআপ ফোল্ডার তৈরিতে ব্যর্থ: ${createRes.statusText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
};

/**
 * Uploads a database backup file (JSON / SQL) to Google Drive
 */
export const uploadBackupToDrive = async (
  token: string,
  fileContent: string,
  fileName: string,
  mimeType: string,
  recordCount: number
): Promise<DriveBackupFile> => {
  const folderId = await ensureBackupFolder(token);

  const boundary = '-------HisabBookBackupBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [folderId],
    description: `হিসাব খাতা ব্যাকআপ | মোট হিসাব: ${recordCount} টি | ব্যাকআপ সময়: ${new Date().toLocaleString('bn-BD')}`
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    fileContent +
    closeDelim;

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,description', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    throw new Error(`গুগল ড্রাইভে ফাইল আপলোডে ব্যর্থ (${uploadRes.status}): ${errBody}`);
  }

  const uploadedFile = await uploadRes.json();
  setLastCloudBackupTime(new Date().toISOString());

  return uploadedFile as DriveBackupFile;
};

/**
 * Lists all HisabBook backups from Google Drive
 */
export const listDriveBackups = async (token: string): Promise<DriveBackupFile[]> => {
  const query = encodeURIComponent("name contains 'HisabBook_Backup' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,description)&orderBy=createdTime desc&pageSize=40`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`ক্লাউড ব্যাকআপ তালিকা আনতে ব্যর্থ: ${res.statusText}`);
  }

  const data = await res.json();
  return (data.files || []) as DriveBackupFile[];
};

/**
 * Downloads a backup file content from Google Drive
 */
export const downloadDriveBackup = async (token: string, fileId: string): Promise<string> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`ড্রাইভ থেকে ফাইল ডাউনলোডে ব্যর্থ: ${res.statusText}`);
  }

  return await res.text();
};

/**
 * Deletes a backup file from Google Drive
 */
export const deleteDriveBackup = async (token: string, fileId: string): Promise<void> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`ড্রাইভ থেকে ফাইল মুছতে ব্যর্থ: ${res.statusText}`);
  }
};

/**
 * Performs an automatic background cloud backup if enabled and token is active
 */
export const triggerAutoCloudBackup = async (): Promise<boolean> => {
  if (!isAutoBackupEnabled()) return false;

  const token = await getAccessToken();
  if (!token) return false;

  try {
    const count = await HisabStorage.getCount();
    if (count === 0) return false;

    const jsonStr = await HisabStorage.exportJSON();
    const today = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `HisabBook_Backup_Auto_${today}.json`;

    await uploadBackupToDrive(
      token,
      jsonStr,
      fileName,
      'application/json',
      count
    );
    return true;
  } catch (err) {
    console.warn('Auto cloud backup error (silent):', err);
    return false;
  }
};
