'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCRMStore } from '@/stores/crm-store'
import { loginMaster, loginAdmin, registerMaster } from '@/lib/crm/firebase-crud'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { Loader2, Building2, Shield, User } from 'lucide-react'

export function LoginScreen() {
  const { setUser } = useCRMStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loginType, setLoginType] = useState<'master' | 'admin'>('master')

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in via Firebase Auth - this is a master user
        // We need to find their user record in Firestore
        try {
          const { getUsers } = await import('@/lib/crm/firebase-crud')
          const users = await getUsers()
          const masterUser = users.find((u: any) => u.email === firebaseUser.email && u.role === 'master')
          if (masterUser) {
            setUser(masterUser)
          }
        } catch {
          // Firestore might not be accessible yet
        }
      }
    })
    return () => unsubscribe()
  }, [setUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isRegister) {
        if (loginType === 'master') {
          const result = await registerMaster(email, password)
          if (result.success) {
            setUser({
              id: result.uid!,
              email,
              name: 'Master Admin',
              role: 'master',
              createdAt: null,
            })
          } else {
            setError(result.error || 'Erro ao registrar')
          }
        }
      } else {
        if (loginType === 'master') {
          const result = await loginMaster(email, password)
          if (result.success) {
            // Get the user record from Firestore
            const { getUsers } = await import('@/lib/crm/firebase-crud')
            const users = await getUsers()
            const masterUser = users.find((u: any) => u.email === email)
            if (masterUser) {
              setUser(masterUser)
            } else {
              // Create the user record if it doesn't exist
              setUser({
                id: result.uid!,
                email,
                name: 'Master Admin',
                role: 'master',
                createdAt: null,
              })
            }
          } else {
            setError(translateError(result.error))
          }
        } else {
          const result = await loginAdmin(email, password)
          if (result.success) {
            setUser({
              id: result.uid!,
              email: result.email!,
              name: result.name!,
              role: 'admin',
              createdAt: null,
            })
          } else {
            setError(result.error || 'Erro ao fazer login')
          }
        }
      }
    } catch (err: any) {
      setError('Ocorreu um erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  const translateError = (msg: string) => {
    if (msg?.includes('auth/invalid-credential') || msg?.includes('auth/wrong-password')) return 'E-mail ou senha incorretos'
    if (msg?.includes('auth/user-not-found')) return 'Usuário não encontrado'
    if (msg?.includes('auth/email-already-in-use')) return 'Este e-mail já está em uso'
    if (msg?.includes('auth/weak-password')) return 'A senha deve ter pelo menos 6 caracteres'
    if (msg?.includes('auth/invalid-email')) return 'E-mail inválido'
    return msg || 'Erro ao fazer login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#2d4f7a] to-[#1a2f4a] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">CRM Pro</h1>
          <p className="text-blue-200 mt-2">Gerencie seus negócios com inteligência</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center text-[#1e3a5f]">
              {isRegister ? 'Criar Conta' : 'Entrar'}
            </CardTitle>
            <CardDescription className="text-center">
              {isRegister ? 'Crie sua conta de administrador' : 'Acesse o painel do CRM'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isRegister && (
              <div className="flex gap-2 mb-6">
                <Button
                  type="button"
                  variant={loginType === 'master' ? 'default' : 'outline'}
                  className={`flex-1 ${loginType === 'master' ? 'bg-[#1e3a5f] hover:bg-[#2d4f7a]' : ''}`}
                  onClick={() => setLoginType('master')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Master
                </Button>
                <Button
                  type="button"
                  variant={loginType === 'admin' ? 'default' : 'outline'}
                  className={`flex-1 ${loginType === 'admin' ? 'bg-[#1e3a5f] hover:bg-[#2d4f7a]' : ''}`}
                  onClick={() => setLoginType('admin')}
                >
                  <User className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-[#1e3a5f] hover:bg-[#2d4f7a] text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : isRegister ? (
                  'Criar Conta'
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister)
                  setError('')
                }}
                className="text-sm text-[#1e3a5f] hover:underline"
              >
                {isRegister ? 'Já tem uma conta? Entrar' : 'Primeiro acesso? Criar conta Master'}
              </button>
            </div>

            {loginType === 'admin' && !isRegister && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                Usuários Admin são criados pelo Master nas Configurações.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
