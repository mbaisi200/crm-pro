'use client'

import React, { useState, useMemo, useRef } from 'react'
import { useCRMStore, Proposal, getTenantId } from '@/stores/crm-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  createProposal,
  updateProposal,
  deleteProposal,
} from '@/lib/crm/firebase-crud'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  Eye,
  Printer,
  Loader2,
  Copy,
} from 'lucide-react'

const PROPOSAL_TEMPLATES = [
  {
    id: 'template-1',
    name: 'Proposta Comercial Padrão',
    content: `<h1 style="color:#1e3a5f;text-align:center;">PROPOSTA COMERCIAL</h1>
<p style="text-align:center;color:#666;">{{dataAtual}}</p>
<hr style="border:1px solid #e5e7eb;margin:20px 0;"/>
<h2 style="color:#1e3a5f;">Cliente: {{cliente.nome}}</h2>
<p><strong>Empresa:</strong> {{empresa.nome}}</p>
<p><strong>E-mail:</strong> {{cliente.email}}</p>
<p><strong>Telefone:</strong> {{cliente.telefone}}</p>
<hr style="border:1px solid #e5e7eb;margin:20px 0;"/>
<h2 style="color:#1e3a5f;">Resumo da Proposta</h2>
<p><strong>Negócio:</strong> {{negocio.titulo}}</p>
<p><strong>Valor Total:</strong> R$ {{negocio.valor}}</p>
<hr style="border:1px solid #e5e7eb;margin:20px 0;"/>
<h2 style="color:#1e3a5f;">Condições Comerciais</h2>
<p>Esta proposta é válida por 30 dias a partir da data de emissão.</p>
<p>Forma de pagamento: Conforme negociação.</p>
<p>Prazo de entrega: A combinar.</p>
<hr style="border:1px solid #e5e7eb;margin:20px 0;"/>
<p style="text-align:center;color:#999;font-size:12px;">Documento gerado automaticamente pelo CRM Pro</p>`,
  },
  {
    id: 'template-2',
    name: 'Proposta de Serviço',
    content: `<h1 style="color:#1e3a5f;">PROPOSTA DE SERVIÇO</h1>
<p style="text-align:right;color:#666;">{{dataAtual}}</p>
<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:20px 0;">
<p><strong>Para:</strong> {{cliente.nome}} - {{empresa.nome}}</p>
<p><strong>Ref:</strong> {{negocio.titulo}}</p>
</div>
<h2 style="color:#1e3a5f;">Escopo do Serviço</h2>
<p>Conforme alinhado, apresentamos nossa proposta de serviço com valor de <strong>R$ {{negocio.valor}}</strong>.</p>
<h2 style="color:#1e3a5f;">Contato</h2>
<p>{{cliente.email}} | {{cliente.telefone}}</p>
<hr style="border:1px solid #e5e7eb;margin:20px 0;"/>
<p style="font-size:12px;color:#999;">CRM Pro - Sistema de Gestão Comercial</p>`,
  },
]

export function ProposalsPage() {
  const { proposals, setProposals, deals, companies, contacts, currentUser } = useCRMStore()
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null)
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    dealId: '',
    clientId: '',
    template: PROPOSAL_TEMPLATES[0].id,
    content: PROPOSAL_TEMPLATES[0].content,
    status: 'draft' as Proposal['status'],
  })

  const filteredProposals = useMemo(() => {
    if (!search) return proposals
    const lower = search.toLowerCase()
    return proposals.filter(p =>
      p.title?.toLowerCase().includes(lower) ||
      p.status?.toLowerCase().includes(lower)
    )
  }, [proposals, search])

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    sent: 'Enviada',
    accepted: 'Aceita',
    rejected: 'Rejeitada',
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-600',
    accepted: 'bg-green-100 text-green-600',
    rejected: 'bg-red-100 text-red-600',
  }

  const getDealTitle = (dealId: string) =>
    deals.find(d => d.id === dealId)?.title || ''

  const getCompanyName = (clientId: string) =>
    companies.find(c => c.id === clientId)?.name || ''

  const openCreate = () => {
    setEditingProposal(null)
    setFormData({
      title: '',
      dealId: '',
      clientId: '',
      template: PROPOSAL_TEMPLATES[0].id,
      content: PROPOSAL_TEMPLATES[0].content,
      status: 'draft',
    })
    setShowDialog(true)
  }

  const openEdit = (proposal: Proposal) => {
    setEditingProposal(proposal)
    setFormData({
      title: proposal.title || '',
      dealId: proposal.dealId || '',
      clientId: proposal.clientId || '',
      template: proposal.template || PROPOSAL_TEMPLATES[0].id,
      content: proposal.content || '',
      status: proposal.status || 'draft',
    })
    setShowDialog(true)
  }

  const replaceVariables = (content: string, dealId: string, clientId: string) => {
    const deal = deals.find(d => d.id === dealId)
    const company = companies.find(c => c.id === clientId)
    const contact = contacts.find(c => c.id === clientId)

    return content
      .replace(/\{\{cliente\.nome\}\}/g, contact?.name || company?.name || 'Cliente')
      .replace(/\{\{cliente\.email\}\}/g, contact?.email || company?.email || '')
      .replace(/\{\{cliente\.telefone\}\}/g, contact?.phone || company?.phone || '')
      .replace(/\{\{empresa\.nome\}\}/g, company?.name || 'Empresa')
      .replace(/\{\{negocio\.titulo\}\}/g, deal?.title || 'Negócio')
      .replace(/\{\{negocio\.valor\}\}/g, deal?.value?.toLocaleString('pt-BR') || '0')
      .replace(/\{\{dataAtual\}\}/g, new Date().toLocaleDateString('pt-BR'))
  }

  const handlePreview = (proposal: Proposal) => {
    const content = replaceVariables(proposal.content, proposal.dealId, proposal.clientId)
    setPreviewContent(content)
    setSelectedProposal(proposal)
  }

  const handlePrint = () => {
    if (!printRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head><title>Proposta - ${selectedProposal?.title || 'CRM'}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
          ${printRef.current.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleSave = async () => {
    if (!formData.title) return
    setSaving(true)
    try {
      if (editingProposal) {
        await updateProposal(editingProposal.id, formData)
        setProposals(proposals.map(p =>
          p.id === editingProposal.id ? { ...p, ...formData } : p
        ))
      } else {
        const id = await createProposal({ ...formData, tenantId: getTenantId(currentUser) || '' })
        setProposals([...proposals, { id, ...formData, tenantId: getTenantId(currentUser) || '', createdAt: null }])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving proposal:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (proposal: Proposal) => {
    if (!confirm(`Excluir proposta "${proposal.title}"?`)) return
    try {
      await deleteProposal(proposal.id)
      setProposals(proposals.filter(p => p.id !== proposal.id))
    } catch (error) {
      console.error('Error deleting proposal:', error)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    const template = PROPOSAL_TEMPLATES.find(t => t.id === templateId)
    setFormData({
      ...formData,
      template: templateId,
      content: template?.content || formData.content,
    })
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
            placeholder="Buscar propostas..."
            className="pl-9 w-72 h-9 bg-white"
          />
        </div>
        <Button onClick={openCreate} className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9">
          <Plus className="w-4 h-4 mr-1" />
          Nova Proposta
        </Button>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead className="hidden md:table-cell">Negócio</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma proposta encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProposals.map(proposal => (
                  <TableRow key={proposal.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-sm">{proposal.title}</TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 text-sm">{getDealTitle(proposal.dealId)}</TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 text-sm">{getCompanyName(proposal.clientId)}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusColors[proposal.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[proposal.status] || proposal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(proposal)}>
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(proposal)}>
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(proposal)}>
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProposal ? 'Editar Proposta' : 'Nova Proposta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Título da proposta" />
              </div>
              <div>
                <Label>Negócio</Label>
                <Select value={formData.dealId} onValueChange={val => setFormData({ ...formData, dealId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o negócio" />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select value={formData.clientId} onValueChange={val => setFormData({ ...formData, clientId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Template</Label>
                <Select value={formData.template} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o template" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSAL_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={val => setFormData({ ...formData, status: val as Proposal['status'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="accepted">Aceita</SelectItem>
                    <SelectItem value="rejected">Rejeitada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Conteúdo da Proposta</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const preview = replaceVariables(formData.content, formData.dealId, formData.clientId)
                    setPreviewContent(preview)
                    setSelectedProposal({ id: '', title: formData.title, dealId: formData.dealId, clientId: formData.clientId, template: formData.template, content: formData.content, status: formData.status, createdAt: null })
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Pré-visualizar
                </Button>
              </div>
              <Textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[200px] font-mono text-xs"
                placeholder="Conteúdo HTML da proposta..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Variáveis disponíveis: {'{{cliente.nome}}, {{cliente.email}}, {{cliente.telefone}}, {{empresa.nome}}, {{negocio.titulo}}, {{negocio.valor}}, {{dataAtual}}'}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4f7a]" disabled={saving || !formData.title}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingProposal ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Sheet */}
      <Sheet open={!!selectedProposal && !showDialog} onOpenChange={open => { if (!open) setSelectedProposal(null) }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-[#1e3a5f]">{selectedProposal?.title || 'Pré-visualização'}</SheetTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-1" />
                  Imprimir
                </Button>
              </div>
            </div>
          </SheetHeader>
          <div className="mt-6">
            <div
              ref={printRef}
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
