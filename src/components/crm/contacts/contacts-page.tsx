'use client'

import React, { useState, useMemo } from 'react'
import { useCRMStore, Contact } from '@/stores/crm-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createContact,
  updateContact,
  deleteContact,
} from '@/lib/crm/firebase-crud'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react'

export function ContactsPage() {
  const { contacts, setContacts, companies } = useCRMStore()
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', position: '', companyId: '', owner: '',
  })

  const filteredContacts = useMemo(() => {
    if (!search) return contacts
    const lower = search.toLowerCase()
    return contacts.filter(c =>
      c.name?.toLowerCase().includes(lower) ||
      c.email?.toLowerCase().includes(lower) ||
      c.position?.toLowerCase().includes(lower)
    )
  }, [contacts, search])

  const getCompanyName = (companyId: string) =>
    companies.find(c => c.id === companyId)?.name || ''

  const openCreate = () => {
    setEditingContact(null)
    setFormData({ name: '', email: '', phone: '', position: '', companyId: '', owner: '' })
    setShowDialog(true)
  }

  const openEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
      companyId: contact.companyId || '',
      owner: contact.owner || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name) return
    setSaving(true)
    try {
      if (editingContact) {
        await updateContact(editingContact.id, formData)
        setContacts(contacts.map(c =>
          c.id === editingContact.id ? { ...c, ...formData } : c
        ))
      } else {
        const id = await createContact({ ...formData, customFields: {} })
        setContacts([...contacts, { id, ...formData, customFields: {}, createdAt: null }])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving contact:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Excluir contato "${contact.name}"?`)) return
    try {
      await deleteContact(contact.id)
      setContacts(contacts.filter(c => c.id !== contact.id))
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar contatos..."
            className="pl-9 w-72 h-9 bg-white"
          />
        </div>
        <Button onClick={openCreate} className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9">
          <Plus className="w-4 h-4 mr-1" />
          Novo Contato
        </Button>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Cargo</TableHead>
                <TableHead className="hidden lg:table-cell">Empresa</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum contato encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map(contact => (
                  <TableRow key={contact.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-medium">
                          {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{contact.name}</p>
                          <p className="text-xs text-gray-400 md:hidden">{contact.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 text-sm">{contact.email || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-500 text-sm">{contact.phone || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{contact.position || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {contact.companyId ? (
                        <Badge variant="secondary" className="text-xs">{getCompanyName(contact.companyId)}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(contact)}>
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(contact)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} placeholder="Cargo/Função" />
            </div>
            <div>
              <Label>Empresa</Label>
              <Select value={formData.companyId} onValueChange={val => setFormData({ ...formData, companyId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Responsável</Label>
              <Input value={formData.owner} onChange={e => setFormData({ ...formData, owner: e.target.value })} placeholder="Nome do responsável" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4f7a]" disabled={saving || !formData.name}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingContact ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
