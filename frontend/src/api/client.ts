import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../store/authStore'
import type { ApiGroup, AuthResponse, ExtractResponse, GroupPayload } from '../types'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }

    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ detail?: string; error?: string; message?: string }>(error)) {
    return (
      error.response?.data?.detail ??
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong'
}

export const authApi = {
  googleLoginUrl(nextPath = '/dashboard') {
    const params = new URLSearchParams({ next: nextPath })
    return `${API_BASE_URL}/auth/google/login?${params.toString()}`
  },
  async login(payload: { email: string; password: string }) {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
    return data
  },
  async register(payload: { email: string; password: string; full_name?: string }) {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload)
    return data
  },
  async refresh(refreshToken: string) {
    const { data } = await apiClient.post<Pick<AuthResponse, 'access_token'>>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return data
  },
}

export const groupsApi = {
  async list() {
    const { data } = await apiClient.get<ApiGroup[]>('/groups')
    return data
  },
  async create(payload: GroupPayload) {
    const { data } = await apiClient.post<ApiGroup>('/groups', payload)
    return data
  },
  async get(groupId: string) {
    const { data } = await apiClient.get<ApiGroup>(`/groups/${groupId}`)
    return data
  },
  async update(groupId: string, payload: GroupPayload) {
    const { data } = await apiClient.put<ApiGroup>(`/groups/${groupId}`, payload)
    return data
  },
  async remove(groupId: string) {
    await apiClient.delete(`/groups/${groupId}`)
  },
  async rotateKey(groupId: string) {
    const { data } = await apiClient.post<ApiGroup>(`/groups/${groupId}/rotate-key`)
    return data
  },
  async extract(groupId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await apiClient.post<ExtractResponse>(`/extract/${groupId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return data
  },
}
