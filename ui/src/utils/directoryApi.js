import { apiUrl } from './api';

export const uploadDirectoryBulk = async (records, token) => {
  const response = await fetch(apiUrl('/api/third-level/officials-registry/bulk-process-directory'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ records })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to process records');
  
  return data.results;
};

export const uploadNotableAchievements = async (records, token) => {
  const response = await fetch(apiUrl('/api/third-level/officials-registry/bulk-process-achievements'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ records })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to process notable achievements');
  
  return data.results;
};
