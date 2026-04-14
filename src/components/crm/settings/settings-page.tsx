'use client'

import React, { useState, useMemo } from 'react'
import { useCRMStore, User, Funnel, CustomField, Automation } from '@/stores/crm-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createUser,
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
  Loader2,
  GripVertical,
  X,
} from 'lucide-react'

// ====== Users Management ======
function UsersSettings() {
  const { users, setUsers, currentUser } = useCRMStore()
  const [showDialog, setShowDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'admin' as 'admin' | 'master' })

  const isMaster = currentUser?.role === 'master'

  const openCreate = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', password: '', role: 'admin' })
    setShowDialog(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setFormData({ name: user.name, email: user.email, password: '', role: user.role })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email) return
    setSaving(true)
    try {
      if (editingUser) {
        const updateData: any = { name: formData.name, email: formData.email, role: formData.role }
        if (formData.password) {
          updateData.password = await simpleHash(formData.password)
        }
        await updateUser(editingUser.id, updateData)
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...updateData, password: undefined } : u))
      } else {
        if (!formData.password) {
          alert('Senha é obrigatória para novos usuários')
          setSaving(false)
          return
        }
        const hashedPassword = await simpleHash(formData.password)
        const id = await createUser({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: hashedPassword,
        })
        setUsers([...users, { id, name: formData.name, email: formData.email, role: formData.role, createdAt: null }])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving user:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (user.role === 'master') {
      alert('Não é possível excluir o usuário Master')
      return
    }
    if (!confirm(`Excluir usuário "${user.name}"?`)) return
    try {
      await deleteUser(user.id)
      setUsers(users.filter(u => u.id !== user.id))
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Gerenciar usuários do sistema</p>
        {isMaster && (
          <Button onClick={openCreate} className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Novo Usuário
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {users.map(user => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${user.role === 'master' ? 'bg-[#1e3a5f]' : 'bg-[#4a6fb5]'}`}>
                {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={user.role === 'master' ? 'bg-[#1e3a5f] text-white' : 'bg-blue-100 text-blue-700'}>
                {user.role === 'master' ? 'Master' : 'Admin'}
              </Badge>
              {isMaster && user.role !== 'master' && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                    <Edit2 className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(user)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <Label>{editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</Label>
              <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <div>
              <Label>Papel</Label>
              <Select value={formData.role} onValueChange={val => setFormData({ ...formData, role: val as 'admin' | 'master' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4f7a]" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====== Funnel Configuration ======
function FunnelSettings() {
  const { funnels, setFunnels } = useCRMStore()
  const [showDialog, setShowDialog] = useState(false)
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null)
  const [saving, setSaving] = useState(false)
  const [funnelName, setFunnelName] = useState('')
  const [stages, setStages] = useState<{ id: string; name: string; color: string; order: number }[]>([])

  const defaultStages = [
    { id: `s-${Date.now()}-1`, name: 'Lead', color: '#6366f1', order: 1 },
    { id: `s-${Date.now()}-2`, name: 'Qualificação', color: '#f59e0b', order: 2 },
    { id: `s-${Date.now()}-3`, name: 'Proposta', color: '#3b82f6', order: 3 },
    { id: `s-${Date.now()}-4`, name: 'Negociação', color: '#f97316', order: 4 },
    { id: `s-${Date.now()}-5`, name: 'Fechamento', color: '#22c55e', order: 5 },
  ]

  const stageColors = ['#6366f1', '#f59e0b', '#3b82f6', '#f97316', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#ef4444']

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
    setStages([...stages, {
      id: `s-${Date.now()}-${stages.length + 1}`,
      name: `Etapa ${stages.length + 1}`,
      color: stageColors[stages.length % stageColors.length],
      order: stages.length + 1,
    }])
  }

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })))
  }

  const updateStage = (index: number, field: string, value: string) => {
    setStages(stages.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const handleSave = async () => {
    if (!funnelName) return
    setSaving(true)
    try {
      if (editingFunnel) {
        await updateFunnel(editingFunnel.id, { name: funnelName, stages })
        setFunnels(funnels.map(f => f.id === editingFunnel.id ? { ...f, name: funnelName, stages } : f))
      } else {
        const id = await createFunnel({ name: funnelName, stages })
        setFunnels([...funnels, { id, name: funnelName, stages, createdAt: null }])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving funnel:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (funnel: Funnel) => {
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
        <p className="text-sm text-gray-500">Configurar funis e suas etapas</p>
        <Button onClick={openCreate} className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Novo Funil
        </Button>
      </div>

      <div className="space-y-3">
        {funnels.map(funnel => (
          <div key={funnel.id} className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-[#1e3a5f]">{funnel.name}</h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(funnel)}>
                  <Edit2 className="w-4 h-4 text-blue-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(funnel)}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(funnel.stages || []).map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-xs text-gray-600">{stage.name}</span>
                  {i < (funnel.stages?.length || 0) - 1 && <span className="text-gray-300">→</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFunnel ? 'Editar Funil' : 'Novo Funil'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nome do Funil *</Label>
              <Input value={funnelName} onChange={e => setFunnelName(e.target.value)} placeholder="Ex: Funil de Vendas" />
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStage(i)}>
                        <X className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4f7a]" disabled={saving || !funnelName}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====== Custom Fields ======
function CustomFieldsSettings() {
  const { customFields, setCustomFields } = useCRMStore()
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
      type: field.type as any,
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
        options: formData.type === 'select' ? formData.options.split(',').map(o => o.trim()).filter(Boolean) : [],
      }
      if (editingField) {
        await updateCustomField(editingField.id, data)
        setCustomFields(customFields.map(f => f.id === editingField.id ? { ...f, ...data } : f))
      } else {
        const id = await createCustomField(data)
        setCustomFields([...customFields, { id, ...data, createdAt: null }])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving custom field:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (field: CustomField) => {
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
        <p className="text-sm text-gray-500">Campos personalizados para cada módulo</p>
        <Button onClick={openCreate} className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Novo Campo
        </Button>
      </div>

      <div className="space-y-3">
        {customFields.map(field => (
          <div key={field.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">{modules.find(m => m.value === field.module)?.label || field.module}</Badge>
              <span className="text-sm font-medium">{field.name}</span>
              <Badge variant="outline" className="text-xs">{types.find(t => t.value === field.type)?.label || field.type}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(field)}>
                <Edit2 className="w-4 h-4 text-blue-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(field)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </div>
        ))}
        {customFields.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Sliders className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum campo personalizado</p>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Editar Campo' : 'Novo Campo Personalizado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Módulo</Label>
              <Select value={formData.module} onValueChange={val => setFormData({ ...formData, module: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do Campo *</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Segmento" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={val => setFormData({ ...formData, type: val as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.type === 'select' && (
              <div>
                <Label>Opções (separadas por vírgula)</Label>
                <Input value={formData.options} onChange={e => setFormData({ ...formData, options: e.target.value })} placeholder="Opção 1, Opção 2, Opção 3" />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4f7a]" disabled={saving || !formData.name}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====== Automations ======
function AutomationsSettings() {
  const { automations, setAutomations } = useCRMStore()
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
      if (editingAutomation) {
        await updateAutomation(editingAutomation.id, formData)
        setAutomations(automations.map(a => a.id === editingAutomation.id ? { ...a, ...formData } : a))
      } else {
        const id = await createAutomation(formData)
        setAutomations([...automations, { id, ...formData, createdAt: null }])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving automation:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (automation: Automation) => {
    try {
      await updateAutomation(automation.id, { active: !automation.active })
      setAutomations(automations.map(a =>
        a.id === automation.id ? { ...a, active: !a.active } : a
      ))
    } catch (error) {
      console.error('Error toggling automation:', error)
    }
  }

  const handleDelete = async (automation: Automation) => {
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
        <p className="text-sm text-gray-500">Automatize ações baseadas em gatilhos</p>
        <Button onClick={openCreate} className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nova Automação
        </Button>
      </div>

      <div className="space-y-3">
        {automations.map(automation => (
          <div key={automation.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <Zap className={`w-5 h-5 ${automation.active ? 'text-amber-500' : 'text-gray-300'}`} />
              <div>
                <p className="text-sm font-medium">
                  {triggers.find(t => t.value === automation.trigger)?.label || automation.trigger}
                </p>
                <p className="text-xs text-gray-400">
                  → {actions.find(a => a.value === automation.actions)?.label || automation.actions}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={automation.active}
                onCheckedChange={() => handleToggleActive(automation)}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(automation)}>
                <Edit2 className="w-4 h-4 text-blue-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(automation)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </div>
        ))}
        {automations.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma automação configurada</p>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAutomation ? 'Editar Automação' : 'Nova Automação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Gatilho *</Label>
              <Select value={formData.trigger} onValueChange={val => setFormData({ ...formData, trigger: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gatilho" />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condições</Label>
              <Input value={formData.conditions} onChange={e => setFormData({ ...formData, conditions: e.target.value })} placeholder="Ex: etapa = Proposta" />
            </div>
            <div>
              <Label>Ação *</Label>
              <Select value={formData.actions} onValueChange={val => setFormData({ ...formData, actions: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ação" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.active} onCheckedChange={val => setFormData({ ...formData, active: val })} />
              <Label>Ativa</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4f7a]" disabled={saving || !formData.trigger || !formData.actions}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====== Main Settings Page ======
export function SettingsPage() {
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
