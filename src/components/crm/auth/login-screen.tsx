'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCRMStore, MASTER_EMAIL } from '@/stores/crm-store'
import { loginMaster, simpleHash } from '@/lib/crm/firebase-crud'
import { auth, db, testFirebaseConnection, getCurrentDomain } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { Loader2, Building2, AlertTriangle, Wifi, Globe, Lock } from 'lucide-react'

export function LoginScreen() {
  const { setUser } = useCRMStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [firebaseStatus, setFirebaseStatus] = useState<{
    auth: boolean
    firestore: boolean
    errors: string[]
    currentDomain?: string
    authDomainAuthorized?: boolean
  } | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)

  // ── Test Firebase connection on mount ──────────────────────────────────────
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

  // ── Listen for Firebase Auth state changes (session persistence) ─────────
  // Only processes Master login to auto-restore sessions.
  // FIX: Queries Firestore BEFORE creating to prevent duplicate master records
  // on every page refresh.
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email?.toLowerCase().trim() === MASTER_EMAIL) {
        try {
          const usersRef = collection(db, 'users')
          const q = query(
            usersRef,
            where('email', '==', firebaseUser.email),
            where('role', '==', 'master'),
          )
          const snapshot = await getDocs(q)

          if (!snapshot.empty) {
            // ── Existing master found — use it ──────────────────────────────
            const userDoc = snapshot.docs[0]
            const userData = userDoc.data()
            setUser({
              id: userDoc.id,
              email: userData.email,
              name: userData.name || 'Master Admin',
              role: 'master',
              companyId: '',
              companyName: '',
              documentType: 'cnpj' as const,
              document: '',
              companyPhone: '',
              companyAddress: '',
              active: true,
              createdAt: userData.createdAt,
            })
          } else {
            // ── No master record found — double-check before creating ──────
            const checkQ = query(usersRef, where('email', '==', firebaseUser.email))
            const checkSnap = await getDocs(checkQ)

            if (!checkSnap.empty) {
              // Record exists but with a different role — use it as-is
              const doc = checkSnap.docs[0]
              const data = doc.data()
              setUser({
                id: doc.id,
                email: data.email,
                name: data.name || 'Master Admin',
                role: data.role || 'master',
                companyId: data.companyId || '',
                companyName: data.companyName || '',
                documentType: data.documentType || 'cnpj' as const,
                document: data.document || '',
                companyPhone: data.companyPhone || '',
                companyAddress: data.companyAddress || '',
                active: data.active !== false,
                createdAt: data.createdAt,
              })
            } else {
              // ── Truly does not exist — create the Firestore record ───────
              try {
                const hashedPassword = await simpleHash('')
                const docRef = await addDoc(usersRef, {
                  email: firebaseUser.email || '',
                  name: 'Master Admin',
                  role: 'master',
                  password: hashedPassword,
                  active: true,
                  createdAt: serverTimestamp(),
                })
                setUser({
                  id: docRef.id,
                  email: firebaseUser.email || '',
                  name: 'Master Admin',
                  role: 'master',
                  companyId: '',
                  companyName: '',
                  documentType: 'cnpj' as const,
                  document: '',
                  companyPhone: '',
                  companyAddress: '',
                  active: true,
                  createdAt: null,
                })
              } catch (createErr: any) {
                console.error('[Login] Failed to create Master Firestore record:', createErr.code, createErr.message)
                // Still allow login with Firebase Auth info
                setUser({
                  id: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  name: 'Master Admin',
                  role: 'master',
                  companyId: '',
                  companyName: '',
                  documentType: 'cnpj' as const,
                  document: '',
                  companyPhone: '',
                  companyAddress: '',
                  active: true,
                  createdAt: null,
                })
              }
            }
          }
        } catch (err: any) {
          console.error('[Login] onAuthStateChanged error:', err.code, err.message)
          // If Firestore is unreachable, still allow login
          if (firebaseUser) {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: 'Master Admin',
              role: 'master',
              companyId: '',
              companyName: '',
              documentType: 'cnpj' as const,
              document: '',
              companyPhone: '',
              companyAddress: '',
              active: true,
              createdAt: null,
            })
          }
        }
      }
    })
    return () => unsubscribe()
  }, [setUser])

  // ── Error translation ─────────────────────────────────────────────────────
  const translateError = (msg: string): string => {
    if (!msg) return 'Erro ao fazer login'
    if (msg.includes('auth/unauthorized-domain')) {
      const domain = getCurrentDomain()
      return `Domínio "${domain}" não autorizado no Firebase. Veja as instruções abaixo.`
    }
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-login'))
      return 'E-mail ou senha incorretos'
    if (msg.includes('auth/user-not-found')) return 'Usuário não encontrado'
    if (msg.includes('auth/email-already-in-use')) return 'Este e-mail já está em uso'
    if (msg.includes('auth/weak-password')) return 'A senha deve ter pelo menos 6 caracteres'
    if (msg.includes('auth/invalid-email')) return 'E-mail inválido'
    if (msg.includes('auth/api-key-not-valid') || msg.includes('auth/invalid-api-key'))
      return 'API Key do Firebase inválida. Verifique as configurações.'
    if (msg.includes('auth/network-request-failed')) return 'Erro de rede. Verifique sua conexão com a internet.'
    if (msg.includes('auth/too-many-requests')) return 'Muitas tentativas. Aguarde um momento e tente novamente.'
    if (msg.includes('auth/app-not-authorized')) return 'App não autorizado no Firebase. Verifique as configurações do projeto.'
    if (msg.includes('permission-denied')) return 'Permissão negada no Firestore. Configure as regras de segurança.'
    if (msg.includes('auth/')) return msg.replace('auth/', '').replace(/-/g, ' ')
    return msg || 'Erro ao fazer login'
  }

  // ── Form submission ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const normalizedEmail = email.toLowerCase().trim()

      if (normalizedEmail === MASTER_EMAIL) {
        // ── Master login ───────────────────────────────────────────────────
        // Use Firebase Auth (signInWithEmailAndPassword)
        const result = await loginMaster(email, password)
        if (!result.success) {
          setError(translateError(result.error || ''))
          return
        }

        // Check Firestore for existing master record (avoid duplicates)
        try {
          const usersRef = collection(db, 'users')
          const masterQ = query(
            usersRef,
            where('email', '==', email),
            where('role', '==', 'master'),
          )
          const masterSnap = await getDocs(masterQ)

          if (!masterSnap.empty) {
            const doc = masterSnap.docs[0]
            const data = doc.data()
            setUser({
              id: doc.id,
              email: data.email,
              name: data.name || 'Master Admin',
              role: 'master',
              companyId: '',
              companyName: '',
              documentType: 'cnpj' as const,
              document: '',
              companyPhone: '',
              companyAddress: '',
              active: true,
              createdAt: data.createdAt,
            })
          } else {
            // Double-check before creating
            const checkQ = query(usersRef, where('email', '==', email))
            const checkSnap = await getDocs(checkQ)

            if (!checkSnap.empty) {
              const doc = checkSnap.docs[0]
              const data = doc.data()
              setUser({
                id: doc.id,
                email: data.email,
                name: data.name || 'Master Admin',
                role: data.role || 'master',
                companyId: data.companyId || '',
                companyName: data.companyName || '',
                documentType: data.documentType || ('cnpj' as const),
                document: data.document || '',
                companyPhone: data.companyPhone || '',
                companyAddress: data.companyAddress || '',
                active: data.active !== false,
                createdAt: data.createdAt,
              })
            } else {
              try {
                const hashedPassword = await simpleHash(password)
                const docRef = await addDoc(usersRef, {
                  email,
                  name: 'Master Admin',
                  role: 'master',
                  password: hashedPassword,
                  active: true,
                  createdAt: serverTimestamp(),
                })
                setUser({
                  id: docRef.id,
                  email,
                  name: 'Master Admin',
                  role: 'master',
                  companyId: '',
                  companyName: '',
                  documentType: 'cnpj' as const,
                  document: '',
                  companyPhone: '',
                  companyAddress: '',
                  active: true,
                  createdAt: null,
                })
              } catch (createErr: any) {
                console.warn('[Login] Could not create Master Firestore record:', createErr.code, createErr.message)
                // Still allow login
                setUser({
                  id: result.uid || '',
                  email,
                  name: 'Master Admin',
                  role: 'master',
                  companyId: '',
                  companyName: '',
                  documentType: 'cnpj' as const,
                  document: '',
                  companyPhone: '',
                  companyAddress: '',
                  active: true,
                  createdAt: null,
                })
              }
            }
          }
        } catch (firestoreErr: any) {
          console.warn('[Login] Firestore access failed, logging in with Auth only:', firestoreErr.code, firestoreErr.message)
          setUser({
            id: result.uid || '',
            email: result.email || email,
            name: 'Master Admin',
            role: 'master',
            companyId: '',
            companyName: '',
            documentType: 'cnpj' as const,
            document: '',
            companyPhone: '',
            companyAddress: '',
            active: true,
            createdAt: null,
          })
        }
      } else {
        // ── Admin / User login ─────────────────────────────────────────────
        // Query Firestore directly so we can check `active` field
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('email', '==', email))
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
          setError('Usuário não encontrado')
          return
        }

        const userDoc = snapshot.docs[0]
        const userData = userDoc.data()

        // Check if user account is active
        if (userData.active === false) {
          setError('Conta desativada. Entre em contato com o administrador.')
          return
        }

        // Compare hashed password
        const hashedPassword = await simpleHash(password)
        if (userData.password !== hashedPassword) {
          setError('Senha incorreta')
          return
        }

        // Success — set user with proper role (admin or user)
        setUser({
          id: userDoc.id,
          email: userData.email,
          name: userData.name || '',
          role: userData.role || 'user',
          companyId: userData.companyId || '',
          companyName: userData.companyName || '',
          documentType: userData.documentType || ('cnpj' as const),
          document: userData.document || '',
          companyPhone: userData.companyPhone || '',
          companyAddress: userData.companyAddress || '',
          active: userData.active !== false,
          createdAt: userData.createdAt,
        })
      }
    } catch (err: any) {
      console.error('[Login] Unexpected error:', err)
      const errCode = err?.code || ''
      const errMessage = err?.message || String(err)

      if (errCode === 'auth/unauthorized-domain') {
        const currentDomain = getCurrentDomain()
        setError(`Domínio "${currentDomain}" não autorizado no Firebase. Veja as instruções abaixo para autorizar.`)
      } else if (errCode === 'auth/api-key-not-valid' || errMessage.includes('api-key-not-valid')) {
        setError('Chave de API do Firebase inválida. Verifique a configuração do Firebase.')
      } else if (errCode === 'auth/invalid-api-key') {
        setError('API Key do Firebase inválida. Verifique as credenciais no código.')
      } else if (errMessage.includes('CORS') || errMessage.includes('Network')) {
        setError('Erro de rede ao conectar com o Firebase. Verifique sua conexão com a internet.')
      } else if (errCode === 'permission-denied') {
        setError('Permissão negada no Firestore. Configure as regras de segurança no Firebase Console.')
      } else {
        setError(translateError(errMessage))
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Connection test handler ───────────────────────────────────────────────
  const handleTestConnection = async () => {
    setTestingConnection(true)
    setError('')
    try {
      const status = await testFirebaseConnection()
      setFirebaseStatus(status)

      if (status.authDomainAuthorized === false) {
        setError(`Domínio "${status.currentDomain}" não autorizado no Firebase. Veja as instruções abaixo para autorizar.`)
      } else if (!status.auth) {
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

  // ── Derived values ────────────────────────────────────────────────────────
  const currentDomain = firebaseStatus?.currentDomain || getCurrentDomain()
  const hasDomainIssue = firebaseStatus?.authDomainAuthorized === false
  const hasFirestoreIssue = firebaseStatus && !firebaseStatus.firestore

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#2d4f7a] to-[#1a2f4a] p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">CRM Pro</h1>
          <p className="text-blue-200 mt-2">Gerencie seus negócios com inteligência</p>
        </div>

        {/* Domain Authorization Warning */}
        {hasDomainIssue && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-300">Domínio não autorizado no Firebase</p>
                <p className="text-xs text-amber-400/80 mt-1">
                  O domínio <strong className="text-amber-200">{currentDomain}</strong> não está na lista de domínios autorizados do Firebase Auth.
                  Por isso, o login via Firebase Authentication não funciona.
                </p>
                <div className="mt-3 p-2 bg-black/20 rounded-lg">
                  <p className="text-xs text-amber-300 font-medium">Como resolver:</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-amber-200/80">
                      1. Acesse <strong>Firebase Console</strong> → Seu projeto (<strong>crm-sis-f9c29</strong>)
                    </p>
                    <p className="text-xs text-amber-200/80">
                      2. No menu lateral, clique em <strong>Authentication</strong> → <strong>Settings</strong> (aba Configurações)
                    </p>
                    <p className="text-xs text-amber-200/80">
                      3. Na seção <strong>Authorized domains</strong>, clique em <strong>Add domain</strong>
                    </p>
                    <p className="text-xs text-amber-200/80">
                      4. Adicione o domínio: <code className="bg-black/30 px-1.5 py-0.5 rounded text-green-300">{currentDomain}</code>
                    </p>
                    <p className="text-xs text-amber-200/80">
                      5. Se estiver usando localhost, adicione também: <code className="bg-black/30 px-1.5 py-0.5 rounded text-green-300">localhost</code>
                    </p>
                    <p className="text-xs text-amber-200/80 mt-1">
                      6. Clique em <strong>Save</strong> e tente fazer login novamente
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Firestore Permission Warning */}
        {hasFirestoreIssue && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300">Permissão negada no Firestore</p>
                <p className="text-xs text-red-400/80 mt-1">
                  O Firebase Auth está {firebaseStatus?.auth ? 'OK' : 'com problema'}, mas o Firestore está bloqueando o acesso.
                  Isso geralmente ocorre quando as Security Rules do Firestore estão restritivas demais.
                </p>
                <div className="mt-2 space-y-1">
                  {firebaseStatus?.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-400/70">• {err}</p>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-black/20 rounded-lg">
                  <p className="text-xs text-amber-300 font-medium">Como resolver:</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-amber-200/80">
                      1. Acesse <strong>Firebase Console</strong> → Seu projeto (<strong>crm-sis-f9c29</strong>)
                    </p>
                    <p className="text-xs text-amber-200/80">
                      2. No menu lateral, clique em <strong>Firestore Database</strong> → aba <strong>Rules</strong>
                    </p>
                    <p className="text-xs text-amber-200/80">
                      3. Substitua as regras por:
                    </p>
                    <code className="block text-xs text-green-300 bg-black/30 p-2 rounded mt-1 font-mono whitespace-pre">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                    </code>
                    <p className="text-xs text-amber-200/60 mt-1">
                      4. Clique em <strong>Publish</strong> e tente novamente
                    </p>
                    <p className="text-xs text-amber-200/40 mt-2">
                      ⚠️ Essas regras permitem acesso total (para desenvolvimento). Em produção, use regras mais restritivas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Connected */}
        {firebaseStatus && firebaseStatus.auth && firebaseStatus.firestore && firebaseStatus.authDomainAuthorized !== false && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-400" />
              <p className="text-xs text-green-300">Firebase conectado (Auth + Firestore OK)</p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center text-[#1e3a5f]">
              Entrar
            </CardTitle>
            <CardDescription className="text-center">
              Acesse o painel do CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            {/* Info text */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 text-center">
              Usuários Admin são criados pelo Master nas Configurações.
            </div>

            {/* Diagnostics */}
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

              {/* Debug info */}
              {firebaseStatus && (
                <div className="mt-2 text-xs text-gray-400 text-center">
                  Domínio atual: <code className="bg-gray-100 px-1 rounded">{currentDomain}</code>
                  {' | '}
                  Auth: {firebaseStatus.auth ? '✓' : '✗'}
                  {' | '}
                  Firestore: {firebaseStatus.firestore ? '✓' : '✗'}
                  {firebaseStatus.authDomainAuthorized !== undefined && (
                    <> {' | '} Domínio: {firebaseStatus.authDomainAuthorized ? '✓ Autorizado' : '✗ NÃO autorizado'}</>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
