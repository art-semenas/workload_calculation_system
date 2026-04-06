import api from './axios'
import type { ApiResponse } from '../types/api'
import type { LoginRequest, LoginResponse, User } from '../types/auth'

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data)
  return response.data.data as LoginResponse
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function getMe(): Promise<User> {
  const response = await api.get<ApiResponse<User>>('/auth/me')
  return response.data.data as User
}
