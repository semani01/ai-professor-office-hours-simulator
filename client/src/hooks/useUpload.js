import { useState } from 'react';

export function useUpload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function uploadFiles(fileList, courseId, token) {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    Array.from(fileList).forEach((f) => formData.append('files[]', f));
    if (courseId) formData.append('courseId', courseId);

    try {
      const res = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');
      if (!data.success && (!data.ingested || data.ingested.length === 0)) {
        throw new Error(data.errors?.[0]?.error || 'No files were ingested');
      }

      setFiles((prev) => [...prev, ...(data.ingested || [])]);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setUploading(false);
    }
  }

  function resetFiles() {
    setFiles([]);
    setError(null);
  }

  return { files, uploading, error, uploadFiles, resetFiles, setFiles };
}
