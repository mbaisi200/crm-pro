'use client'

import React, { useState, useMemo } from 'react'
import { useCRMStore, Product, getTenantId } from '@/stores/crm-store'
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
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/lib/crm/firebase-crud'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Loader2,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

export function ProductsPage() {
  const { products, setProducts, currentUser } = useCRMStore()
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '', sku: '', price: '', description: '', category: '',
  })

  const filteredProducts = useMemo(() => {
    if (!search) return products
    const lower = search.toLowerCase()
    return products.filter(p =>
      p.name?.toLowerCase().includes(lower) ||
      p.sku?.toLowerCase().includes(lower) ||
      p.category?.toLowerCase().includes(lower)
    )
  }, [products, search])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const openCreate = () => {
    setEditingProduct(null)
    setFormData({ name: '', sku: '', price: '', description: '', category: '' })
    setShowDialog(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      price: String(product.price || ''),
      description: product.description || '',
      category: product.category || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name) return
    setSaving(true)
    try {
      const data = {
        ...formData,
        price: Number(formData.price) || 0,
      }
      if (editingProduct) {
        await updateProduct(editingProduct.id, data)
        setProducts(products.map(p =>
          p.id === editingProduct.id ? { ...p, ...data } : p
        ))
      } else {
        const id = await createProduct({ ...data, tenantId: getTenantId(currentUser) || '' })
        setProducts([...products, { id, ...data, tenantId: getTenantId(currentUser) || '', createdAt: null }])
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`Excluir produto "${product.name}"?`)) return
    try {
      await deleteProduct(product.id)
      setProducts(products.filter(p => p.id !== product.id))
    } catch (error) {
      console.error('Error deleting product:', error)
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
            placeholder="Buscar produtos..."
            className="pl-9 w-72 h-9 bg-white"
          />
        </div>
        <Button onClick={openCreate} className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9">
          <Plus className="w-4 h-4 mr-1" />
          Novo Produto
        </Button>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Descrição</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum produto encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map(product => (
                  <TableRow key={product.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-sm">{product.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 text-sm font-mono">{product.sku || '—'}</TableCell>
                    <TableCell className="font-semibold text-[#1e3a5f] text-sm">{formatCurrency(product.price)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {product.category ? <Badge variant="secondary" className="text-xs">{product.category}</Badge> : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-500 text-sm max-w-48 truncate">{product.description || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(product)}>
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
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do produto/serviço" />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} placeholder="PROD-001" />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Categoria" />
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição do produto" className="min-h-[80px]" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4f7a]" disabled={saving || !formData.name}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingProduct ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
