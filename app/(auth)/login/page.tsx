import { LoginForm, type LoginFormProps } from '@/features/auth'

export default function LoginPage({ searchParams }: Required<LoginFormProps>) {
  return <LoginForm searchParams={searchParams} />
}
