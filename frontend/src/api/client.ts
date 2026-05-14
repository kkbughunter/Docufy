import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'
import type {
  ApiGroup,
  AuthResponse,
  BillingPlan,
  BillingSummary,
  ExtractResponse,
  GroupPayload,
  UsageHistoryItem,
  UsageSummary,
} from '../types'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8000'

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

async function requestAccessTokenRefresh(refreshToken: string) {
  const { data } = await axios.post<Pick<AuthResponse, 'access_token'>>(
    `${API_BASE_URL}/auth/refresh`,
    {
      refresh_token: refreshToken,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )

  return data
}

let refreshPromise: Promise<string> | null = null

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    const status = error.response?.status

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    const { refreshToken, logout, setAccessToken } = useAuthStore.getState()
    if (!refreshToken) {
      logout()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = requestAccessTokenRefresh(refreshToken)
          .then((payload) => {
            setAccessToken(payload.access_token)
            return payload.access_token
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      const newAccessToken = await refreshPromise
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      logout()
      return Promise.reject(refreshError)
    }
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
    return requestAccessTokenRefresh(refreshToken)
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

export const billingApi = {
  async plans() {
    const { data } = await apiClient.get<BillingPlan[]>('/billing/plans')
    return data
  },
  async summary() {
    const { data } = await apiClient.get<BillingSummary>('/billing/summary')
    return data
  },
  async startCheckout(planKey: string) {
    const { data } = await apiClient.post<{ checkout_url: string; session_id: string }>(
      '/billing/checkout',
      { plan_key: planKey },
    )
    return data
  },
  async startPortal() {
    const { data } = await apiClient.post<{ portal_url: string }>('/billing/portal')
    return data
  },
}

export const usageApi = {
  async summary() {
    const { data } = await apiClient.get<UsageSummary>('/usage/summary')
    return data
  },
  async history(params?: { groupId?: string; limit?: number }) {
    const search = new URLSearchParams()
    if (params?.groupId) {
      search.set('group_id', params.groupId)
    }
    if (params?.limit) {
      search.set('limit', String(params.limit))
    }

    const query = search.toString()
    const { data } = await apiClient.get<UsageHistoryItem[]>(`/usage/history${query ? `?${query}` : ''}`)
    return data
  },
}
