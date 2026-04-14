'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useCRMStore, MASTER_EMAIL, getTenantId, User, Funnel, CustomField, Automation } from '@/stores/crm-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getAdmins,
  getUsersByTenant,
  registerAdmin,
  registerCompanyUser,
  updateUser,
  deleteUser,
  createFunnel,
  updateFunnel,
  deleteFunnel,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  simpleHash,
} from '@/lib/crm/firebase-crud'
import {
  Plus,
  Trash2,
  Edit2,
  Users,
  GitBranch,
  Sliders,
  Zap,
  Shield,
  Building2,
  Loader2,
  GripVertical,
  X,
  ShieldAlert,
  Eye,
} from 'lucide-react'

// =============================================================================
// 1. MasterAdminsSettings — Master manages admin companies
// =============================================================================
function MasterAdminsSettings() {
  const { users, setUsers } = useCRMStore()
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const emptyForm = {
    name: '',
    email: '',
    password: '',
    companyName: '',
    documentType: 'cnpj' as 'cnpj' | 'cpf',
    document: '',
    companyPhone: '',
    companyAddress: '',
  }
  const [formData, setFormData] = useState(emptyForm)

  const loadAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdmins()
      setAdmins(data)
    } catch (err) {
      console.error('Error loading admins:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAdmins()
  }, [loadAdmins])

  const openCreate = () => {
    setEditingAdmin(null)
    setFormData(emptyForm)
    setError('')
    setShowDialog(true)
  }

  const openEdit = (admin: User) => {
    setEditingAdmin(admin)
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '',
      companyName: admin.companyName || '',
      documentType: admin.documentType || 'cnpj',
      document: admin.document || '',
      companyPhone: admin.companyPhone || '',
      companyAddress: admin.companyAddress || '',
    })
    setError('')
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.companyName || !formData.document) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingAdmin) {
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          companyName: formData.companyName,
          documentType: formData.documentType,
          document: formData.document,
          companyPhone: formData.companyPhone,
          companyAddress: formData.companyAddress,
        }
        if (formData.password) {
          updateData.password = await simpleHash(formData.password)
        }
        await updateUser(editingAdmin.id, updateData)
        setAdmins(prev =>
          prev.map(a =>
            a.id === editingAdmin.id
              ? { ...a, ...updateData, password: undefined }
              : a
          )
        )
      } else {
        if (!formData.password) {
          setError('Senha é obrigatória para novos admins')
          setSaving(false)
          return
        }
        const result = await registerAdmin({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          documentType: formData.documentType,
          document: formData.document,
          companyPhone: formData.companyPhone,
          companyAddress: formData.companyAddress,
        })

        if (!result.success) {
          setError(result.error || 'Erro ao criar empresa')
          setSaving(false)
          return
        }

        setAdmins(prev => [
          ...prev,
          {
            id: result.id!,
            name: formData.name,
            email: formData.email,
            role: 'admin' as const,
            companyName: formData.companyName,
            documentType: formData.documentType,
            document: formData.document,
            companyPhone: formData.companyPhone,
            companyAddress: formData.companyAddress,
            companyId: '',
            active: true,
            createdAt: null,
          },
        ])
      }

      setShowDialog(false)
      // Also refresh the global users list
      const allUsers = [...users]
      if (!editingAdmin) {
        allUsers.push({
          id: admins.length.toString(),
          name: formData.name,
          email: formData.email,
          role: 'admin',
          companyName: formData.companyName,
          documentType: formData.documentType,
          document: formData.document,
          companyPhone: formData.companyPhone,
          companyAddress: formData.companyAddress,
          companyId: '',
          active: true,
          createdAt: null,
        })
      }
      setUsers(allUsers)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (admin: User) => {
    try {
      const newActive = !admin.active
      await updateUser(admin.id, { active: newActive })
      setAdmins(prev =>
        prev.map(a => (a.id === admin.id ? { ...a, active: newActive } : a))
      )
    } catch (err) {
      console.error('Error toggling admin:', err)
    }
  }

  const handleDelete = async (admin: User) => {
    if (!confirm(`Excluir empresa "${admin.companyName}" e o admin "${admin.name}"?`)) return
    try {
      await deleteUser(admin.id)
      setAdmins(prev => prev.filter(a => a.id !== admin.id))
      setUsers(users.filter(u => u.id !== admin.id))
    } catch (err) {
      console.error('Error deleting admin:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Gerenciar empresas e seus administradores
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {admins.length} empresa{admins.length !== 1 ? 's' : ''} cadastrada{admins.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova Empresa
        </Button>
      </div>

      {admins.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhuma empresa cadastrada</p>
          <p className="text-xs mt-1">Clique em &quot;Nova Empresa&quot; para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map(admin => (
            <div
              key={admin.id}
              className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-sm font-medium shrink-0 mt-0.5">
                    {(admin.companyName || admin.name)
                      .split(' ')
                      .map(w => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {admin.companyName || admin.name}
                      </p>
                      <Badge
                        className={
                          admin.active !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }
                        variant="outline"
                      >
                        {admin.active !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Admin: {admin.name} • {admin.email}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {admin.documentType?.toUpperCase() || 'CNPJ'}
                        </Badge>
                        {admin.document || '—'}
                      </span>
                      {admin.companyPhone && (
                        <span>{admin.companyPhone}</span>
                      )}
                    </div>
                    {admin.companyAddress && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md">
                        {admin.companyAddress}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggleActive(admin)}
                    title={admin.active !== false ? 'Desativar' : 'Ativar'}
                  >
                    <Eye className={`w-4 h-4 ${admin.active !== false ? 'text-emerald-500' : 'text-gray-300'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(admin)}
                  >
                    <Edit2 className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(admin)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Admin Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAdmin ? 'Editar Empresa' : 'Nova Empresa'}
            </DialogTitle>
            <DialogDescription>
              {editingAdmin
                ? 'Atualize os dados da empresa e administrador.'
                : 'Cadastre uma nova empresa com seu administrador.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            {/* Admin info */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Dados do Administrador
              </p>
              <div>
                <Label>Nome do Admin *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="João da Silva"
                />
              </div>
              <div>
                <Label>E-mail do Admin *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@empresa.com.br"
                />
              </div>
              <div>
                <Label>
                  {editingAdmin ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
                </Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Company info */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Dados da Empresa
              </p>
              <div>
                <Label>Razão Social *</Label>
                <Input
                  value={formData.companyName}
                  onChange={e =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  placeholder="Empresa LTDA"
                />
              </div>

              <div>
                <Label>Tipo de Documento *</Label>
                <RadioGroup
                  value={formData.documentType}
                  onValueChange={val =>
                    setFormData({
                      ...formData,
                      documentType: val as 'cnpj' | 'cpf',
                      document: '',
                    })
                  }
                  className="flex gap-4 mt-1.5"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="cnpj" id="doc-cnpj" />
                    <Label htmlFor="doc-cnpj" className="text-sm font-normal cursor-pointer">
                      CNPJ
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="cpf" id="doc-cpf" />
                    <Label htmlFor="doc-cpf" className="text-sm font-normal cursor-pointer">
                      CPF
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>
                  {formData.documentType === 'cnpj' ? 'CNPJ' : 'CPF'} *
                </Label>
                <Input
                  value={formData.document}
                  onChange={e =>
                    setFormData({ ...formData, document: e.target.value })
                  }
                  placeholder={
                    formData.documentType === 'cnpj'
                      ? '00.000.000/0001-00'
                      : '000.000.000-00'
                  }
                />
              </div>

              <div>
                <Label>Telefone da Empresa</Label>
                <Input
                  value={formData.companyPhone}
                  onChange={e =>
                    setFormData({ ...formData, companyPhone: e.target.value })
                  }
                  placeholder="(00) 0000-0000"
                />
              </div>

              <div>
                <Label>Endereço da Empresa</Label>
                <Input
                  value={formData.companyAddress}
                  onChange={e =>
                    setFormData({ ...formData, companyAddress: e.target.value })
                  }
                  placeholder="Rua, Número - Cidade/UF"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#1e3a5f] hover:bg-[#2d4f7a]"
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// 2. UsersSettings — Admin manages company users
// =============================================================================
function UsersSettings() {
  const { currentUser, users, setUsers } = useCRMStore()
  const [companyUsers, setCompanyUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })

  const tenantId = currentUser?.id || ''

  const loadUsers = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const data = await getUsersByTenant(tenantId)
      setCompanyUsers(data)
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const openCreate = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', password: '' })
    setError('')
    setShowDialog(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setFormData({ name: user.name, email: user.email, password: '' })
    setError('')
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      setError('Nome e e-mail são obrigatórios')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingUser) {
        const updateData: any = { name: formData.name, email: formData.email }
        if (formData.password) {
          updateData.password = await simpleHash(formData.password)
        }
        await updateUser(editingUser.id, updateData)
        setCompanyUsers(prev =>
          prev.map(u =>
            u.id === editingUser.id ? { ...u, ...updateData, password: undefined } : u
          )
        )
      } else {
        if (!formData.password) {
          setError('Senha é obrigatória para novos usuários')
          setSaving(false)
          return
        }
        const result = await registerCompanyUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          companyId: tenantId,
        })

        if (!result.success) {
          setError(result.error || 'Erro ao criar usuário')
          setSaving(false)
          return
        }

        setCompanyUsers(prev => [
          ...prev,
          {
            id: result.id!,
            name: formData.name,
            email: formData.email,
            role: 'user' as const,
            companyId: tenantId,
            companyName: '',
            documentType: 'cnpj' as const,
            document: '',
            companyPhone: '',
            companyAddress: '',
            active: true,
            createdAt: null,
          },
        ])
      }

      setShowDialog(false)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const newActive = !user.active
      await updateUser(user.id, { active: newActive })
      setCompanyUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, active: newActive } : u))
      )
    } catch (err) {
      console.error('Error toggling user:', err)
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Excluir usuário "${user.name}"?`)) return
    try {
      await deleteUser(user.id)
      setCompanyUsers(prev => prev.filter(u => u.id !== user.id))
      setUsers(users.filter(u => u.id !== user.id))
    } catch (err) {
      console.error('Error deleting user:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Gerenciar usuários da empresa
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {companyUsers.length} usuário{companyUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo Usuário
        </Button>
      </div>

      {companyUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhum usuário cadastrado</p>
          <p className="text-xs mt-1">
            Clique em &quot;Novo Usuário&quot; para adicionar membros à equipe
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {companyUsers.map(user => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0 ${
                    user.active !== false ? 'bg-[#4a6fb5]' : 'bg-gray-300'
                  }`}
                >
                  {user.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <Badge
                      className={
                        user.active !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }
                      variant="outline"
                    >
                      {user.active !== false ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleActive(user)}
                  title={user.active !== false ? 'Desativar' : 'Ativar'}
                >
                  <Eye
                    className={`w-4 h-4 ${
                      user.active !== false ? 'text-emerald-500' : 'text-gray-300'
                    }`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(user)}
                >
                  <Edit2 className="w-4 h-4 text-blue-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(user)}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit User Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Atualize os dados do usuário.'
                : 'Adicione um novo membro à equipe da empresa.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@empresa.com.br"
              />
            </div>
            <div>
              <Label>
                {editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
              </Label>
              <Input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#1e3a5f] hover:bg-[#2d4f7a]"
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// 3. FunnelSettings — Both Master and Admin manage funnels
// =============================================================================
function FunnelSettings() {
  const { funnels, setFunnels, currentUser } = useCRMStore()
  const [showDialog, setShowDialog] = useState(false)
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null)
  const [saving, setSaving] = useState(false)
  const [funnelName, setFunnelName] = useState('')
  const [stages, setStages] = useState<
    { id: string; name: string; color: string; order: number }[]
  >([])

  const tenantId = getTenantId(currentUser)
  const isMaster = currentUser?.role === 'master'

  // Filter funnels by tenant
  const filteredFunnels = isMaster
    ? funnels // Master sees all funnels
    : funnels.filter(f => f.tenantId === tenantId)

  const defaultStages = [
    { id: `s-${Date.now()}-1`, name: 'Lead', color: '#6366f1', order: 1 },
    { id: `s-${Date.now()}-2`, name: 'Qualificação', color: '#f59e0b', order: 2 },
    { id: `s-${Date.now()}-3`, name: 'Proposta', color: '#3b82f6', order: 3 },
    { id: `s-${Date.now()}-4`, name: 'Negociação', color: '#f97316', order: 4 },
    { id: `s-${Date.now()}-5`, name: 'Fechamento', color: '#22c55e', order: 5 },
  ]

  const stageColors = [
    '#6366f1', '#f59e0b', '#3b82f6', '#f97316', '#22c55e',
    '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#ef4444',
  ]

  const openCreate = () => {
    setEditingFunnel(null)
    setFunnelName('')
    setStages(defaultStages)
    setShowDialog(true)
  }

  const openEdit = (funnel: Funnel) => {
    setEditingFunnel(funnel)
    setFunnelName(funnel.name)
    setStages(funnel.stages || [])
    setShowDialog(true)
  }

  const addStage = () => {
    setStages([
      ...stages,
      {
        id: `s-${Date.now()}-${stages.length + 1}`,
        name: `Etapa ${stages.length + 1}`,
        color: stageColors[stages.length % stageColors.length],
        order: stages.length + 1,
      },
    ])
  }

  const removeStage = (index: number) => {
    setStages(
      stages
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 }))
    )
  }

  const updateStage = (index: number, field: string, value: string) => {
    setStages(
      stages.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  const handleSave = async () => {
    if (!funnelName) return
    setSaving(true)
    try {
      const data = { name: funnelName, stages, tenantId: tenantId || '' }
      if (editingFunnel) {
        await updateFunnel(editingFunnel.id, data)
        setFunnels(
          funnels.map(f =>
            f.id === editingFunnel.id ? { ...f, ...data } : f
          )
        )
      } else {
        const id = await createFunnel(data)
        setFunnels([
          ...funnels,
          { id, name: funnelName, stages, tenantId: tenantId || '', createdAt: null },
        ])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving funnel:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (funnel: Funnel) => {
    if (isMaster && funnel.tenantId !== 'master') {
      alert('Funis de outros tenants só podem ser editados por seus respectivos administradores.')
      return
    }
    if (!confirm(`Excluir funil "${funnel.name}"?`)) return
    try {
      await deleteFunnel(funnel.id)
      setFunnels(funnels.filter(f => f.id !== funnel.id))
    } catch (error) {
      console.error('Error deleting funnel:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Configurar funis e suas etapas</p>
          {isMaster && (
            <p className="text-xs text-gray-400 mt-0.5">
              Visualizando todos os funis de todos os tenants
            </p>
          )}
        </div>
        {!isMaster && (
          <Button
            onClick={openCreate}
            className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo Funil
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {filteredFunnels.map(funnel => (
          <div
            key={funnel.id}
            className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm text-[#1e3a5f]">
                  {funnel.name}
                </h3>
                {isMaster && funnel.tenantId && funnel.tenantId !== 'master' && (
                  <p className="text-[10px] text-gray-400">
                    Tenant: {funnel.tenantId.slice(0, 12)}...
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!isMaster && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(funnel)}
                    >
                      <Edit2 className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(funnel)}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(funnel.stages || []).map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs text-gray-600">{stage.name}</span>
                  {i < (funnel.stages?.length || 0) - 1 && (
                    <span className="text-gray-300">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {filteredFunnels.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhum funil configurado</p>
            {!isMaster && (
              <p className="text-xs mt-1">
                Clique em &quot;Novo Funil&quot; para criar
              </p>
            )}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFunnel ? 'Editar Funil' : 'Novo Funil'}
            </DialogTitle>
            <DialogDescription>
              {editingFunnel
                ? 'Atualize o nome e as etapas do funil.'
                : 'Crie um novo funil com suas etapas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome do Funil *</Label>
              <Input
                value={funnelName}
                onChange={e => setFunnelName(e.target.value)}
                placeholder="Ex: Funil de Vendas"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Etapas</Label>
                <Button variant="outline" size="sm" onClick={addStage}>
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {stages.map((stage, i) => (
                  <div key={stage.id} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <input
                      type="color"
                      value={stage.color}
                      onChange={e => updateStage(i, 'color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={stage.name}
                      onChange={e => updateStage(i, 'name', e.target.value)}
                      className="flex-1 h-8"
                      placeholder="Nome da etapa"
                    />
                    {stages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeStage(i)}
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#1e3a5f] hover:bg-[#2d4f7a]"
                disabled={saving || !funnelName}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// 4. CustomFieldsSettings
// =============================================================================
function CustomFieldsSettings() {
  const { customFields, setCustomFields, currentUser } = useCRMStore()
  const tenantId = getTenantId(currentUser)
  const isMaster = currentUser?.role === 'master'

  const filteredFields = isMaster
    ? customFields
    : customFields.filter(f => f.tenantId === tenantId)

  const [showDialog, setShowDialog] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    module: 'deals',
    name: '',
    type: 'text' as 'text' | 'date' | 'select' | 'formula',
    options: '',
  })

  const modules = [
    { value: 'deals', label: 'Negócios' },
    { value: 'companies', label: 'Empresas' },
    { value: 'contacts', label: 'Contatos' },
  ]

  const types = [
    { value: 'text', label: 'Texto' },
    { value: 'date', label: 'Data' },
    { value: 'select', label: 'Seleção' },
    { value: 'formula', label: 'Fórmula' },
  ]

  const openCreate = () => {
    setEditingField(null)
    setFormData({ module: 'deals', name: '', type: 'text', options: '' })
    setShowDialog(true)
  }

  const openEdit = (field: CustomField) => {
    setEditingField(field)
    setFormData({
      module: field.module,
      name: field.name,
      type: field.type as 'text' | 'date' | 'select' | 'formula',
      options: (field.options || []).join(', '),
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name) return
    setSaving(true)
    try {
      const data = {
        module: formData.module,
        name: formData.name,
        type: formData.type,
        options:
          formData.type === 'select'
            ? formData.options
                .split(',')
                .map(o => o.trim())
                .filter(Boolean)
            : [],
        tenantId: tenantId || '',
      }
      if (editingField) {
        await updateCustomField(editingField.id, data)
        setCustomFields(
          customFields.map(f =>
            f.id === editingField.id ? { ...f, ...data } : f
          )
        )
      } else {
        const id = await createCustomField(data)
        setCustomFields([
          ...customFields,
          { id, ...data, createdAt: null },
        ])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving custom field:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (field: CustomField) => {
    if (isMaster && field.tenantId && field.tenantId !== 'master') {
      alert('Campos de outros tenants só podem ser removidos por seus administradores.')
      return
    }
    if (!confirm(`Excluir campo "${field.name}"?`)) return
    try {
      await deleteCustomField(field.id)
      setCustomFields(customFields.filter(f => f.id !== field.id))
    } catch (error) {
      console.error('Error deleting custom field:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Campos personalizados para cada módulo</p>
          {isMaster && (
            <p className="text-xs text-gray-400 mt-0.5">
              Visualizando campos de todos os tenants
            </p>
          )}
        </div>
        {!isMaster && (
          <Button
            onClick={openCreate}
            className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo Campo
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {filteredFields.map(field => (
          <div
            key={field.id}
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {modules.find(m => m.value === field.module)?.label || field.module}
              </Badge>
              <span className="text-sm font-medium">{field.name}</span>
              <Badge variant="outline" className="text-xs">
                {types.find(t => t.value === field.type)?.label || field.type}
              </Badge>
              {isMaster && field.tenantId && field.tenantId !== 'master' && (
                <span className="text-[10px] text-gray-400">
                  {field.tenantId.slice(0, 12)}...
                </span>
              )}
            </div>
            {!isMaster && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(field)}
                >
                  <Edit2 className="w-4 h-4 text-blue-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(field)}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {filteredFields.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Sliders className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhum campo personalizado</p>
            {!isMaster && (
              <p className="text-xs mt-1">
                Clique em &quot;Novo Campo&quot; para adicionar
              </p>
            )}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Editar Campo' : 'Novo Campo Personalizado'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Módulo</Label>
              <Select
                value={formData.module}
                onValueChange={val => setFormData({ ...formData, module: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do Campo *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Segmento"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={val =>
                  setFormData({
                    ...formData,
                    type: val as 'text' | 'date' | 'select' | 'formula',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.type === 'select' && (
              <div>
                <Label>Opções (separadas por vírgula)</Label>
                <Input
                  value={formData.options}
                  onChange={e =>
                    setFormData({ ...formData, options: e.target.value })
                  }
                  placeholder="Opção 1, Opção 2, Opção 3"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#1e3a5f] hover:bg-[#2d4f7a]"
                disabled={saving || !formData.name}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// 5. AutomationsSettings
// =============================================================================
function AutomationsSettings() {
  const { automations, setAutomations, currentUser } = useCRMStore()
  const tenantId = getTenantId(currentUser)
  const isMaster = currentUser?.role === 'master'

  const filteredAutomations = isMaster
    ? automations
    : automations.filter(a => a.tenantId === tenantId)

  const [showDialog, setShowDialog] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    trigger: '',
    conditions: '',
    actions: '',
    active: true,
  })

  const triggers = [
    { value: 'deal.stage.changed', label: 'Negócio muda de etapa' },
    { value: 'deal.created', label: 'Negócio criado' },
    { value: 'deal.value.changed', label: 'Valor do negócio alterado' },
  ]

  const actions = [
    { value: 'send.email', label: 'Enviar e-mail' },
    { value: 'create.task', label: 'Criar tarefa' },
    { value: 'generate.pdf', label: 'Gerar PDF' },
    { value: 'notify.user', label: 'Notificar usuário' },
  ]

  const openCreate = () => {
    setEditingAutomation(null)
    setFormData({ trigger: '', conditions: '', actions: '', active: true })
    setShowDialog(true)
  }

  const openEdit = (automation: Automation) => {
    setEditingAutomation(automation)
    setFormData({
      trigger: automation.trigger,
      conditions: automation.conditions,
      actions: automation.actions,
      active: automation.active,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.trigger || !formData.actions) return
    setSaving(true)
    try {
      const data = {
        trigger: formData.trigger,
        conditions: formData.conditions,
        actions: formData.actions,
        active: formData.active,
        tenantId: tenantId || '',
      }
      if (editingAutomation) {
        await updateAutomation(editingAutomation.id, data)
        setAutomations(
          automations.map(a =>
            a.id === editingAutomation.id ? { ...a, ...data } : a
          )
        )
      } else {
        const id = await createAutomation(data)
        setAutomations([...automations, { id, ...data, createdAt: null }])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving automation:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (automation: Automation) => {
    if (isMaster && automation.tenantId && automation.tenantId !== 'master') return
    try {
      await updateAutomation(automation.id, { active: !automation.active })
      setAutomations(
        automations.map(a =>
          a.id === automation.id ? { ...a, active: !a.active } : a
        )
      )
    } catch (error) {
      console.error('Error toggling automation:', error)
    }
  }

  const handleDelete = async (automation: Automation) => {
    if (isMaster && automation.tenantId && automation.tenantId !== 'master') {
      alert('Automações de outros tenants só podem ser removidas por seus administradores.')
      return
    }
    if (!confirm('Excluir esta automação?')) return
    try {
      await deleteAutomation(automation.id)
      setAutomations(automations.filter(a => a.id !== automation.id))
    } catch (error) {
      console.error('Error deleting automation:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Automatize ações baseadas em gatilhos</p>
          {isMaster && (
            <p className="text-xs text-gray-400 mt-0.5">
              Visualizando automações de todos os tenants
            </p>
          )}
        </div>
        {!isMaster && (
          <Button
            onClick={openCreate}
            className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nova Automação
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {filteredAutomations.map(automation => (
          <div
            key={automation.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Zap
                className={`w-5 h-5 shrink-0 ${
                  automation.active ? 'text-amber-500' : 'text-gray-300'
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {triggers.find(t => t.value === automation.trigger)?.label ||
                    automation.trigger}
                </p>
                <p className="text-xs text-gray-400">
                  →{' '}
                  {actions.find(a => a.value === automation.actions)?.label ||
                    automation.actions}
                </p>
                {isMaster && automation.tenantId && automation.tenantId !== 'master' && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Tenant: {automation.tenantId.slice(0, 12)}...
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Switch
                checked={automation.active}
                onCheckedChange={() => handleToggleActive(automation)}
                disabled={
                  isMaster && automation.tenantId && automation.tenantId !== 'master'
                }
              />
              {!isMaster && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(automation)}
                  >
                    <Edit2 className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(automation)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {filteredAutomations.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhuma automação configurada</p>
            {!isMaster && (
              <p className="text-xs mt-1">
                Clique em &quot;Nova Automação&quot; para criar
              </p>
            )}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAutomation ? 'Editar Automação' : 'Nova Automação'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Gatilho *</Label>
              <Select
                value={formData.trigger}
                onValueChange={val => setFormData({ ...formData, trigger: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gatilho" />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condições</Label>
              <Input
                value={formData.conditions}
                onChange={e =>
                  setFormData({ ...formData, conditions: e.target.value })
                }
                placeholder="Ex: etapa = Proposta"
              />
            </div>
            <div>
              <Label>Ação *</Label>
              <Select
                value={formData.actions}
                onValueChange={val => setFormData({ ...formData, actions: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ação" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map(a => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.active}
                onCheckedChange={val =>
                  setFormData({ ...formData, active: val })
                }
              />
              <Label>Ativa</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#1e3a5f] hover:bg-[#2d4f7a]"
                disabled={saving || !formData.trigger || !formData.actions}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// 6. Restricted view for regular users
// =============================================================================
function RestrictedView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <ShieldAlert className="w-16 h-16 mb-4 opacity-30" />
      <h2 className="text-lg font-semibold text-gray-600 mb-1">
        Acesso Restrito
      </h2>
      <p className="text-sm text-center max-w-md">
        Esta seção é restrita para administradores. Entre em contato com o
        administrador da sua empresa para gerenciar configurações do sistema.
      </p>
    </div>
  )
}

// =============================================================================
// 6. Main SettingsPage — Role-based tab routing
// =============================================================================
export function SettingsPage() {
  const { currentUser } = useCRMStore()
  const role = currentUser?.role

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Regular users get a restricted view
  if (role === 'user') {
    return <RestrictedView />
  }

  // ── MASTER ───────────────────────────────────────────────────────────────
  if (role === 'master') {
    return (
      <div>
        <Tabs defaultValue="admins">
          <TabsList className="mb-6">
            <TabsTrigger value="admins" className="gap-1.5">
              <Building2 className="w-4 h-4" />
              Empresas (Admins)
            </TabsTrigger>
            <TabsTrigger value="funnels" className="gap-1.5">
              <GitBranch className="w-4 h-4" />
              Funis
            </TabsTrigger>
            <TabsTrigger value="fields" className="gap-1.5">
              <Sliders className="w-4 h-4" />
              Campos
            </TabsTrigger>
            <TabsTrigger value="automations" className="gap-1.5">
              <Zap className="w-4 h-4" />
              Automações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admins">
            <MasterAdminsSettings />
          </TabsContent>
          <TabsContent value="funnels">
            <FunnelSettings />
          </TabsContent>
          <TabsContent value="fields">
            <CustomFieldsSettings />
          </TabsContent>
          <TabsContent value="automations">
            <AutomationsSettings />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────
  if (role === 'admin') {
    return (
      <div>
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="funnels" className="gap-1.5">
              <GitBranch className="w-4 h-4" />
              Funis
            </TabsTrigger>
            <TabsTrigger value="fields" className="gap-1.5">
              <Sliders className="w-4 h-4" />
              Campos
            </TabsTrigger>
            <TabsTrigger value="automations" className="gap-1.5">
              <Zap className="w-4 h-4" />
              Automações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersSettings />
          </TabsContent>
          <TabsContent value="funnels">
            <FunnelSettings />
          </TabsContent>
          <TabsContent value="fields">
            <CustomFieldsSettings />
          </TabsContent>
          <TabsContent value="automations">
            <AutomationsSettings />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Fallback
  return <RestrictedView />
}
