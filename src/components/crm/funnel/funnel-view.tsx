'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useCRMStore, Deal, Stage, getTenantId } from '@/stores/crm-store'
import { DealCard } from './deal-card'
import { DealDetailPanel } from './deal-detail-panel'
import { updateDeal, createDeal, deleteDeal } from '@/lib/crm/firebase-crud'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Filter } from 'lucide-react'
import { useCRMStore as useStore } from '@/stores/crm-store'

// Droppable column wrapper for empty columns
function DroppableStageColumn({ stageId, children, className }: { stageId: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId, data: { type: 'stage' } })
  return (
    <div ref={setNodeRef} className={`${className || ''} ${isOver ? 'bg-blue-50/50' : ''}`}>
      {children}
    </div>
  )
}

export function FunnelView() {
  const {
    funnels,
    deals,
    companies,
    contacts,
    selectedFunnel,
    setSelectedFunnel,
    setSelectedDeal,
    setDeals,
  } = useCRMStore()

  const [activeDealId, setActiveDealId] = useState<string | null>(null)
  const [showNewDealDialog, setShowNewDealDialog] = useState(false)
  const [newDealData, setNewDealData] = useState({
    title: '',
    value: '',
    companyId: '',
    contactId: '',
    owner: '',
  })
  const [saving, setSaving] = useState(false)

  const currentFunnel = selectedFunnel || funnels[0]
  const stages: Stage[] = currentFunnel?.stages || []

  const funnelDeals = useMemo(() => {
    if (!currentFunnel) return []
    return deals.filter(d => d.funnelId === currentFunnel.id)
  }, [deals, currentFunnel])

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {}
    stages.forEach(stage => {
      map[stage.id] = funnelDeals
        .filter(d => d.stageId === stage.id)
        .sort((a, b) => {
          const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0
          const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0
          return dateB - dateA
        })
    })
    return map
  }, [funnelDeals, stages])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeDeal = useMemo(() => {
    if (!activeDealId) return null
    return deals.find(d => d.id === activeDealId) || null
  }, [activeDealId, deals])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDealId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // We handle the actual move in onDragEnd
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDealId(null)

    if (!over || !currentFunnel) return

    const dealId = active.id as string
    const deal = deals.find(d => d.id === dealId)
    if (!deal) return

    // Determine the target stage
    let targetStageId: string | null = null

    // Check if dropped on a stage column (droppable id is stage id)
    const overId = over.id as string
    if (stages.some(s => s.id === overId)) {
      targetStageId = overId
    } else {
      // Dropped on another deal card - find the stage of that deal
      const overDeal = deals.find(d => d.id === overId)
      if (overDeal) {
        targetStageId = overDeal.stageId
      }
    }

    if (targetStageId && targetStageId !== deal.stageId) {
      // Optimistic update
      const updatedDeals = deals.map(d =>
        d.id === dealId ? { ...d, stageId: targetStageId! } : d
      )
      setDeals(updatedDeals)

      // Persist to Firestore
      try {
        await updateDeal(dealId, { stageId: targetStageId })
      } catch (error) {
        console.error('Error updating deal stage:', error)
        setDeals(deals) // Revert on error
      }
    }
  }, [deals, stages, currentFunnel, setDeals])

  const handleCreateDeal = async () => {
    if (!currentFunnel || !newDealData.title) return
    setSaving(true)
    try {
      const firstStage = stages[0]
      const dealId = await createDeal({
        title: newDealData.title,
        value: Number(newDealData.value) || 0,
        companyId: newDealData.companyId,
        contactId: newDealData.contactId,
        funnelId: currentFunnel.id,
        stageId: firstStage?.id || '',
        owner: newDealData.owner || currentUser?.name || '',
        products: [],
        customFields: {},
        tenantId: getTenantId(currentUser) || '',
      })

      // Optimistically add to local state
      setDeals([...deals, {
        id: dealId,
        title: newDealData.title,
        value: Number(newDealData.value) || 0,
        companyId: newDealData.companyId,
        contactId: newDealData.contactId,
        funnelId: currentFunnel.id,
        stageId: firstStage?.id || '',
        owner: newDealData.owner || '',
        products: [],
        customFields: {},
        tenantId: getTenantId(currentUser) || '',
        createdAt: null,
        updatedAt: null,
      }])

      setShowNewDealDialog(false)
      setNewDealData({ title: '', value: '', companyId: '', contactId: '', owner: '' })
    } catch (error) {
      console.error('Error creating deal:', error)
    } finally {
      setSaving(false)
    }
  }

  const currentUser = useStore.getState().currentUser

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value)

  const getCompanyName = (companyId: string) =>
    companies.find(c => c.id === companyId)?.name || ''

  const getStageTotal = (stageId: string) => {
    return (dealsByStage[stageId] || []).reduce((sum, d) => sum + (d.value || 0), 0)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Funnel Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Select
            value={currentFunnel?.id || ''}
            onValueChange={(val) => {
              const funnel = funnels.find(f => f.id === val)
              if (funnel) setSelectedFunnel(funnel)
            }}
          >
            <SelectTrigger className="w-48 h-9 bg-white border-gray-200">
              <SelectValue placeholder="Selecione o funil" />
            </SelectTrigger>
            <SelectContent>
              {funnels.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="w-4 h-4 mr-1" />
            Filtros
          </Button>
        </div>

        <Dialog open={showNewDealDialog} onOpenChange={setShowNewDealDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9">
              <Plus className="w-4 h-4 mr-1" />
              Novo Negócio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Negócio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={newDealData.title}
                  onChange={e => setNewDealData({ ...newDealData, title: e.target.value })}
                  placeholder="Ex: Software ERP - Empresa X"
                />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={newDealData.value}
                  onChange={e => setNewDealData({ ...newDealData, value: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Empresa</Label>
                <Select
                  value={newDealData.companyId}
                  onValueChange={val => setNewDealData({ ...newDealData, companyId: val })}
                >
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
              <div>
                <Label>Contato</Label>
                <Select
                  value={newDealData.contactId}
                  onValueChange={val => setNewDealData({ ...newDealData, contactId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o contato" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsável</Label>
                <Input
                  value={newDealData.owner}
                  onChange={e => setNewDealData({ ...newDealData, owner: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
              <Button
                onClick={handleCreateDeal}
                className="w-full bg-[#1e3a5f] hover:bg-[#2d4f7a]"
                disabled={saving || !newDealData.title}
              >
                {saving ? 'Criando...' : 'Criar Negócio'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max pb-4">
            {stages.map((stage) => (
              <DroppableStageColumn key={stage.id} stageId={stage.id}>
                <div
                  className="w-72 flex-shrink-0 flex flex-col bg-gray-50 rounded-xl"
                  data-stage-id={stage.id}
                >
                {/* Stage Header */}
                <div className="p-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="font-semibold text-sm text-gray-700">{stage.name}</h3>
                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {(dealsByStage[stage.id] || []).length}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatCurrency(getStageTotal(stage.id))}
                  </span>
                </div>

                {/* Deal Cards */}
                <SortableContext
                  items={(dealsByStage[stage.id] || []).map(d => d.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[100px]">
                    {(dealsByStage[stage.id] || []).map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        stageColor={stage.color}
                        companyName={getCompanyName(deal.companyId)}
                        onClick={() => setSelectedDeal(deal)}
                      />
                    ))}
                  </div>
                </SortableContext>
                </div>
              </DroppableStageColumn>
            ))}
          </div>

          <DragOverlay>
            {activeDeal ? (
              <DealCard
                deal={activeDeal}
                stageColor={stages.find(s => s.id === activeDeal.stageId)?.color || '#6366f1'}
                companyName={getCompanyName(activeDeal.companyId)}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Deal Detail Panel */}
      <DealDetailPanel />
    </div>
  )
}
