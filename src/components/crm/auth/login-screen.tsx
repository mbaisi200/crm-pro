'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCRMStore } from '@/stores/crm-store'
import { loginMaster, loginAdmin, registerMaster } from '@/lib/crm/firebase-crud'
import { auth, testFirebaseConnection } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { Loader2, Building2, Shield, User, AlertTriangle, Wifi, WifiOff } from 'lucide-react'

export function LoginScreen() {
  const { setUser } = useCRMStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loginType, setLoginType] = useState<'master' | 'admin'>('master')
  const [firebaseStatus, setFirebaseStatus] = useState<{ auth: boolean; firestore: boolean; errors: string[] } | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)

  // Test Firebase connection on mount
  React.useEffect(() => {
    const testConnection = async () => {
      setTestingConnection(true)
      try {
        const status = await testFirebaseConnection()
        setFirebaseStatus(status)
        if (status.errors.length > 0) {
          console.warn('[Login] Firebase issues detected:', status.errors)
        }
      } catch (e) {
        console.error('[Login] Connection test failed:', e)
      } finally {
        setTestingConnection(false)
      }
    }
    testConnection()
  }, [])

  // Listen for Firebase Auth state changes (e.g. session persistence)
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in via Firebase Auth - this is a master user
        try {
          const { getUsers, createUser } = await import('@/lib/crm/firebase-crud')
          const users = await getUsers()
          const masterUser = users.find((u: any) => u.email === firebaseUser.email && u.role === 'master')
          if (masterUser) {
            setUser(masterUser)
          } else {
            // Auto-create Firestore record for Master
            try {
              const docId = await createUser({
                email: firebaseUser.email || '',
                name: 'Master Admin',
                role: 'master',
                password: '',
              })
              setUser({
                id: docId,
                email: firebaseUser.email || '',
                name: 'Master Admin',
                role: 'master',
                createdAt: null,
              })
            } catch (firestoreErr: any) {
              console.error('[Login] Firestore write failed:', firestoreErr.code, firestoreErr.message)
              // If Firestore fails, still log in with basic info
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: 'Master Admin',
                role: 'master',
                createdAt: null,
              })
            }
          }
        } catch (err: any) {
          console.error('[Login] onAuthStateChanged error:', err.code, err.message)
          // If Firestore read fails, still allow login with Firebase Auth info
          if (firebaseUser) {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: 'Master Admin',
              role: 'master',
              createdAt: null,
            })
          }
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
            setError(translateError(result.error || ''))
          }
        }
      } else {
        if (loginType === 'master') {
          // Step 1: Authenticate with Firebase Auth
          const result = await loginMaster(email, password)
          if (result.success) {
            // Step 2: Try to get/create Firestore user record
            try {
              const { getUsers, createUser, simpleHash } = await import('@/lib/crm/firebase-crud')
              const users = await getUsers()
              const masterUser = users.find((u: any) => u.email === email)
              if (masterUser) {
                setUser(masterUser)
              } else {
                // Auto-create the user record in Firestore
                try {
                  const hashedPassword = await simpleHash(password)
                  const docId = await createUser({
                    email,
                    name: 'Master Admin',
                    role: 'master',
                    password: hashedPassword,
                  })
                  setUser({
                    id: docId,
                    email,
                    name: 'Master Admin',
                    role: 'master',
                    createdAt: null,
                  })
                } catch (createErr: any) {
                  console.warn('[Login] Could not create Firestore user record:', createErr.code, createErr.message)
                  // Still allow login - Firestore record will be created later
                  setUser({
                    id: result.uid || '',
                    email,
                    name: 'Master Admin',
                    role: 'master',
                    createdAt: null,
                  })
                }
              }
            } catch (firestoreErr: any) {
              console.warn('[Login] Firestore access failed, logging in with Auth only:', firestoreErr.code, firestoreErr.message)
              // If Firestore is not accessible, still allow login via Firebase Auth
              setUser({
                id: result.uid || '',
                email: result.email || email,
                name: 'Master Admin',
                role: 'master',
                createdAt: null,
              })
            }
          } else {
            setError(translateError(result.error || ''))
          }
        } else {
          // Admin login - requires Firestore access
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
      console.error('[Login] Unexpected error:', err)
      // Show more detailed error for debugging
      const errCode = err?.code || ''
      const errMessage = err?.message || String(err)

      if (errCode === 'auth/api-key-not-valid' || errMessage.includes('api-key-not-valid')) {
        setError('Chave de API do Firebase inválida. Verifique a configuração do Firebase.')
      } else if (errCode === 'auth/invalid-api-key') {
        setError('API Key do Firebase inválida. Verifique as credenciais no código.')
      } else if (errMessage.includes('CORS') || errMessage.includes('Network')) {
        setError('Erro de rede ao conectar com o Firebase. Verifique sua conexão com a internet.')
      } else if (errCode === 'permission-denied') {
        setError('Permissão negada no Firestore. Configure as regras de segurança no Firebase Console.')
      } else {
        setError(`Erro: ${errMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const translateError = (msg: string) => {
    if (!msg) return 'Erro ao fazer login'
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-login')) return 'E-mail ou senha incorretos'
    if (msg.includes('auth/user-not-found')) return 'Usuário não encontrado'
    if (msg.includes('auth/email-already-in-use')) return 'Este e-mail já está em uso'
    if (msg.includes('auth/weak-password')) return 'A senha deve ter pelo menos 6 caracteres'
    if (msg.includes('auth/invalid-email')) return 'E-mail inválido'
    if (msg.includes('auth/api-key-not-valid') || msg.includes('auth/invalid-api-key')) return 'API Key do Firebase inválida. Verifique as configurações.'
    if (msg.includes('auth/network-request-failed')) return 'Erro de rede. Verifique sua conexão com a internet.'
    if (msg.includes('auth/too-many-requests')) return 'Muitas tentativas. Aguarde um momento e tente novamente.'
    if (msg.includes('auth/app-not-authorized')) return 'App não autorizado no Firebase. Verifique as configurações do projeto.'
    if (msg.includes('permission-denied')) return 'Permissão negada no Firestore. Configure as regras de segurança.'
    if (msg.includes('auth/')) return msg.replace('auth/', '').replace(/-/g, ' ')
    return msg || 'Erro ao fazer login'
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setError('')
    try {
      const status = await testFirebaseConnection()
      setFirebaseStatus(status)

      if (!status.auth) {
        setError('Firebase Auth não está acessível. Verifique a API Key e o authDomain no Firebase Console.')
      } else if (!status.firestore) {
        setError('Firebase Firestore não está acessível. Provável problema com as Security Rules. Vá em Firebase Console > Firestore Database > Rules e permita acesso.')
      } else {
        setError('')
      }
    } catch (e: any) {
      setError('Erro ao testar conexão: ' + e.message)
    } finally {
      setTestingConnection(false)
    }
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

        {/* Firebase Connection Status */}
        {firebaseStatus && !firebaseStatus.firestore && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300">Problema de conexão com o Firestore</p>
                <p className="text-xs text-red-400/80 mt-1">
                  O Firebase Auth está {firebaseStatus.auth ? 'OK' : 'com problema'}, mas o Firestore não está acessível.
                  Isso geralmente ocorre quando as Security Rules do Firestore estão bloqueando o acesso.
                </p>
                <div className="mt-2 space-y-1">
                  {firebaseStatus.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-400/70">• {err}</p>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-black/20 rounded-lg">
                  <p className="text-xs text-amber-300 font-medium">Como resolver:</p>
                  <p className="text-xs text-amber-200/80 mt-1">
                    1. Acesse <strong>Firebase Console</strong> → Seu projeto → <strong>Firestore Database</strong> → <strong>Rules</strong>
                  </p>
                  <p className="text-xs text-amber-200/80">
                    2. Substitua as regras por:
                  </p>
                  <code className="block text-xs text-green-300 bg-black/30 p-2 rounded mt-1 font-mono">
                    {'rules_version = \'2\';'}<br />
                    {'service cloud.firestore {'}<br />
                    {'  match /databases/{database}/documents {'}<br />
                    {'    match /{document=**} {'}<br />
                    {'      allow read, write: if true;'}<br />
                    {'    }'}<br />
                    {'  }'}<br />
                    {'}'}
                  </code>
                  <p className="text-xs text-amber-200/60 mt-1">
                    3. Clique em <strong>Publish</strong> e tente novamente
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {firebaseStatus && firebaseStatus.auth && firebaseStatus.firestore && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-400" />
              <p className="text-xs text-green-300">Firebase conectado (Auth + Firestore OK)</p>
            </div>
          </div>
        )}

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

            {/* Diagnostics button */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-gray-400 hover:text-gray-600"
                onClick={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Testando conexão...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Testar conexão com Firebase
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
