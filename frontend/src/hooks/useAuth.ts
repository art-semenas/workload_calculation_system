import { useMutation, useQuery } from '@tanstack/react-query'
import { getMe, login, logout } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export function useLogin() {
  const loginToStore = useAuthStore((state) => state.login)

  return useMutation({
    mutationFn: login,
    onSuccess: ({ token, user }) => {
      loginToStore(token, user)
    },
  })
}

export function useLogout() {
  const logoutFromStore = useAuthStore((state) => state.logout)

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      logoutFromStore()
    },
  })
}

export function useMe() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    enabled: !!token,
  })
}
