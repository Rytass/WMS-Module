import axios from 'axios';

export async function uploadFile(
  file: File,
): Promise<{ data: { id: string } }> {
  const formData = new FormData();

  formData.append('file', file, encodeURI(file.name));

  return axios.post('/api/files/upload', formData);
}
