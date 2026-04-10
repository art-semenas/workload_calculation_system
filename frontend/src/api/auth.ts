import api from './axios'
import type { ApiResponse } from '../types/api'
import { LoginResponseSchema, UserSchema } from '../types/auth'
import type { LoginRequest } from '../types/auth'

export async function login(data: LoginRequest) {
  const response = await api.post<ApiResponse<unknown>>('/auth/login', data, {
    skipAuthRedirect: true,
  })
  return LoginResponseSchema.parse(response.data.data)
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function getMe() {
  const response = await api.get<ApiResponse<unknown>>('/auth/me')
  return UserSchema.parse(response.data.data)
}
