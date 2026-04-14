'use client'

import React, { useState, useMemo } from 'react'
import { useCRMStore, Company, getTenantId } from '@/stores/crm-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  createCompany,
  updateCompany,
  deleteCompany,
} from '@/lib/crm/firebase-crud'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Loader2,
  Eye,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export function CompaniesPage() {
  const { companies, setCompanies, deals, contacts, currentUser } = useCRMStore()
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '', cnpj: '', industry: '', phone: '', email: '', address: '', website: '', owner: '',
  })

  const filteredCompanies = useMemo(() => {
    if (!search) return companies
    const lower = search.toLowerCase()
    return companies.filter(c =>
      c.name?.toLowerCase().includes(lower) ||
      c.industry?.toLowerCase().includes(lower) ||
      c.email?.toLowerCase().includes(lower)
    )
  }, [companies, search])

  const openCreate = () => {
    setEditingCompany(null)
    setFormData({ name: '', cnpj: '', industry: '', phone: '', email: '', address: '', website: '', owner: '' })
    setShowDialog(true)
  }

  const openEdit = (company: Company) => {
    setEditingCompany(company)
    setFormData({
      name: company.name || '',
      cnpj: company.cnpj || '',
      industry: company.industry || '',
      phone: company.phone || '',
      email: company.email || '',
      address: company.address || '',
      website: company.website || '',
      owner: company.owner || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name) return
    setSaving(true)
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, formData)
        setCompanies(companies.map(c =>
          c.id === editingCompany.id ? { ...c, ...formData } : c
        ))
      } else {
        const id = await createCompany({ ...formData, customFields: {}, tenantId: getTenantId(currentUser) || '' })
        setCompanies([...companies, { id, ...formData, customFields: {}, tenantId: getTenantId(currentUser) || '', createdAt: null }])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving company:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (company: Company) => {
    if (!confirm(`Excluir empresa "${company.name}"?`)) return
    try {
      await deleteCompany(company.id)
      setCompanies(companies.filter(c => c.id !== company.id))
    } catch (error) {
      console.error('Error deleting company:', error)
    }
  }

  const companyDeals = useMemo(() => {
    if (!selectedCompany) return []
    return deals.filter(d => d.companyId === selectedCompany.id)
  }, [deals, selectedCompany])

  const companyContacts = useMemo(() => {
    if (!selectedCompany) return []
    return contacts.filter(c => c.companyId === selectedCompany.id)
  }, [contacts, selectedCompany])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empresas..."
            className="pl-9 w-72 h-9 bg-white"
          />
        </div>
        <Button onClick={openCreate} className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9">
          <Plus className="w-4 h-4 mr-1" />
          Nova Empresa
        </Button>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                <TableHead className="hidden md:table-cell">Indústria</TableHead>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma empresa encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map(company => (
                  <TableRow key={company.id} className="hover:bg-gray-50">
                    <TableCell>
                      <button
                        onClick={() => setSelectedCompany(company)}
                        className="font-medium text-[#1e3a5f] hover:underline text-left"
                      >
                        {company.name}
                      </button>
                      <p className="text-xs text-gray-400 md:hidden">{company.cnpj}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 text-sm">{company.cnpj || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {company.industry ? <Badge variant="secondary" className="text-xs">{company.industry}</Badge> : '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-500 text-sm">{company.phone || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-500 text-sm">{company.owner || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCompany(company)}>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(company)}>
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(company)}>
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
            <DialogTitle>{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nome da empresa" />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <Label>Indústria</Label>
              <Input value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} placeholder="Setor" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 0000-0000" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@empresa.com" />
            </div>
            <div className="col-span-2">
              <Label>Endereço</Label>
              <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Endereço completo" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="www.empresa.com" />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input value={formData.owner} onChange={e => setFormData({ ...formData, owner: e.target.value })} placeholder="Nome do responsável" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4f7a]" disabled={saving || !formData.name}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingCompany ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Detail Sheet */}
      <Sheet open={!!selectedCompany} onOpenChange={open => { if (!open) setSelectedCompany(null) }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedCompany && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl text-[#1e3a5f]">{selectedCompany.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {selectedCompany.cnpj && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    CNPJ: {selectedCompany.cnpj}
                  </div>
                )}
                {selectedCompany.industry && (
                  <div className="text-sm">
                    <Badge variant="secondary">{selectedCompany.industry}</Badge>
                  </div>
                )}
                {selectedCompany.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selectedCompany.phone}
                  </div>
                )}
                {selectedCompany.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {selectedCompany.email}
                  </div>
                )}
                {selectedCompany.website && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="w-4 h-4 text-gray-400" />
                    {selectedCompany.website}
                  </div>
                )}
                {selectedCompany.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {selectedCompany.address}
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">Contatos vinculados ({companyContacts.length})</h3>
                  {companyContacts.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum contato vinculado</p>
                  ) : (
                    <div className="space-y-2">
                      {companyContacts.map(c => (
                        <div key={c.id} className="text-sm p-2 bg-gray-50 rounded-lg">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-gray-400 ml-2">{c.position}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">Negócios vinculados ({companyDeals.length})</h3>
                  {companyDeals.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum negócio vinculado</p>
                  ) : (
                    <div className="space-y-2">
                      {companyDeals.map(d => (
                        <div key={d.id} className="text-sm p-2 bg-gray-50 rounded-lg flex justify-between">
                          <span className="font-medium">{d.title}</span>
                          <span className="text-gray-500">R$ {d.value?.toLocaleString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
