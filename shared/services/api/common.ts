import { request } from './client';

export async function getUserProfile(token: string) {
  return request('/user/profile', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function updateUserProfile(token: string, profileData: any) {
  return request('/user/profile', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(profileData),
  });
}

export async function changePassword(token: string, oldPassword: string, newPassword: string) {
  return request('/user/change-password', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      oldPassword,
      newPassword,
    }),
  });
}


