'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useCRMStore, Activity, Task } from '@/stores/crm-store'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  getActivitiesByDeal,
  createActivity,
  getTasksByDeal,
  createTask,
  updateTask,
  updateDeal,
  deleteDeal,
} from '@/lib/crm/firebase-crud'
import {
  X,
  MessageSquare,
  Mail,
  Phone,
  StickyNote,
  CheckSquare,
  Paperclip,
  Plus,
  Trash2,
  Clock,
  User,
  Building2,
  DollarSign,
  Calendar,
  Loader2,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function DealDetailPanel() {
  const {
    selectedDeal,
    setSelectedDeal,
    deals,
    setDeals,
    companies,
    contacts,
    activities,
    setActivities,
    tasks,
    setTasks,
    funnels,
  } = useCRMStore()

  const [dealActivities, setDealActivities] = useState<Activity[]>([])
  const [dealTasks, setDealTasks] = useState<Task[]>([])
  const [newNote, setNewNote] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [activityFilter, setActivityFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const company = useMemo(
    () => companies.find(c => c.id === selectedDeal?.companyId),
    [companies, selectedDeal]
  )

  const contact = useMemo(
    () => contacts.find(c => c.id === selectedDeal?.contactId),
    [contacts, selectedDeal]
  )

  const stage = useMemo(() => {
    if (!selectedDeal) return null
    for (const funnel of funnels) {
      const s = funnel.stages?.find(st => st.id === selectedDeal.stageId)
      if (s) return s
    }
    return null
  }, [funnels, selectedDeal])

  useEffect(() => {
    if (selectedDeal) {
      loadDealDetails()
    }
  }, [selectedDeal?.id])

  const loadDealDetails = async () => {
    if (!selectedDeal) return
    setLoadingDetails(true)
    try {
      const [acts, tks] = await Promise.all([
        getActivitiesByDeal(selectedDeal.id),
        getTasksByDeal(selectedDeal.id),
      ])
      setDealActivities(acts)
      setDealTasks(tks)
    } catch (error) {
      console.error('Error loading deal details:', error)
      // Fallback to store data
      setDealActivities(activities.filter(a => a.dealId === selectedDeal.id))
      setDealTasks(tasks.filter(t => t.dealId === selectedDeal.id))
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleAddNote = async () => {
    if (!selectedDeal || !newNote.trim()) return
    setSaving(true)
    try {
      const actId = await createActivity({
        type: 'note',
        dealId: selectedDeal.id,
        authorId: useCRMStore.getState().currentUser?.name || 'Usuário',
        content: newNote,
      })
      setDealActivities(prev => [...prev, {
        id: actId,
        type: 'note',
        dealId: selectedDeal.id,
        authorId: useCRMStore.getState().currentUser?.name || 'Usuário',
        content: newNote,
        createdAt: { seconds: Date.now() / 1000 },
      }])
      setNewNote('')
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddTask = async () => {
    if (!selectedDeal || !newTaskTitle.trim()) return
    setSaving(true)
    try {
      const taskId = await createTask({
        dealId: selectedDeal.id,
        title: newTaskTitle,
        dueDate: newTaskDueDate || new Date().toISOString().split('T')[0],
        completed: false,
        assigneeId: useCRMStore.getState().currentUser?.name || 'Usuário',
      })
      setDealTasks(prev => [...prev, {
        id: taskId,
        dealId: selectedDeal.id,
        title: newTaskTitle,
        dueDate: newTaskDueDate || new Date().toISOString().split('T')[0],
        completed: false,
        assigneeId: useCRMStore.getState().currentUser?.name || 'Usuário',
        createdAt: { seconds: Date.now() / 1000 },
      }])
      setNewTaskTitle('')
      setNewTaskDueDate('')
    } catch (error) {
      console.error('Error adding task:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleTask = async (task: Task) => {
    try {
      await updateTask(task.id, { completed: !task.completed })
      setDealTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, completed: !t.completed } : t
      ))
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleDeleteDeal = async () => {
    if (!selectedDeal) return
    if (!confirm('Tem certeza que deseja excluir este negócio?')) return
    try {
      await deleteDeal(selectedDeal.id)
      setDeals(deals.filter(d => d.id !== selectedDeal.id))
      setSelectedDeal(null)
    } catch (error) {
      console.error('Error deleting deal:', error)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const formatDate = (date: any) => {
    if (!date) return ''
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return dealActivities
    return dealActivities.filter(a => a.type === activityFilter)
  }, [dealActivities, activityFilter])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note': return <StickyNote className="w-4 h-4 text-blue-500" />
      case 'email': return <Mail className="w-4 h-4 text-purple-500" />
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-green-500" />
      case 'call': return <Phone className="w-4 h-4 text-orange-500" />
      default: return <StickyNote className="w-4 h-4 text-gray-400" />
    }
  }

  const isTaskOverdue = (dueDate: string) => new Date(dueDate) < new Date()

  if (!selectedDeal) return null

  return (
    <Sheet open={!!selectedDeal} onOpenChange={(open) => { if (!open) setSelectedDeal(null) }}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b bg-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl text-[#1e3a5f]">{selectedDeal.title}</SheetTitle>
              <div className="flex items-center gap-3 mt-2">
                {stage && (
                  <Badge
                    className="text-white text-xs"
                    style={{ backgroundColor: stage.color }}
                  >
                    {stage.name}
                  </Badge>
                )}
                <span className="text-lg font-bold text-[#1e3a5f]">
                  {formatCurrency(selectedDeal.value)}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDeal(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 120px)' }}>
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6 h-10">
              <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e3a5f] data-[state=active]:shadow-none rounded-none px-3">Detalhes</TabsTrigger>
              <TabsTrigger value="activities" className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e3a5f] data-[state=active]:shadow-none rounded-none px-3">Atividades</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e3a5f] data-[state=active]:shadow-none rounded-none px-3">Tarefas</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="flex-1 p-6 space-y-6 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Empresa</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {company?.name || '—'}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Contato</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    {contact?.name || '—'}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Valor</Label>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    {formatCurrency(selectedDeal.value)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Responsável</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    {selectedDeal.owner || '—'}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Etapa Atual</Label>
                <div className="flex items-center gap-2 mt-1">
                  {stage && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  )}
                  <span className="text-sm">{stage?.name || '—'}</span>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Mover para etapa</h4>
                <div className="flex flex-wrap gap-2">
                  {funnels.find(f => f.id === selectedDeal.funnelId)?.stages.map(s => (
                    <Button
                      key={s.id}
                      variant={s.id === selectedDeal.stageId ? 'default' : 'outline'}
                      size="sm"
                      className={s.id === selectedDeal.stageId ? 'text-white' : ''}
                      style={s.id === selectedDeal.stageId ? { backgroundColor: s.color } : {}}
                      onClick={async () => {
                        try {
                          await updateDeal(selectedDeal.id, { stageId: s.id })
                          setDeals(deals.map(d =>
                            d.id === selectedDeal.id ? { ...d, stageId: s.id } : d
                          ))
                          setSelectedDeal({ ...selectedDeal, stageId: s.id })
                        } catch (error) {
                          console.error('Error moving deal:', error)
                        }
                      }}
                    >
                      <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteDeal}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Negócio
              </Button>
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities" className="flex-1 p-6 mt-0">
              <div className="space-y-4">
                {/* Add Note */}
                <div className="space-y-2">
                  <Textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Adicionar nota..."
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddNote}
                      className="bg-[#1e3a5f] hover:bg-[#2d4f7a]"
                      size="sm"
                      disabled={!newNote.trim() || saving}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                      Adicionar Nota
                    </Button>
                    <Select value={activityFilter} onValueChange={setActivityFilter}>
                      <SelectTrigger className="w-36 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="note">Notas</SelectItem>
                        <SelectItem value="email">E-mails</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="call">Ligações</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-3">
                  {filteredActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma atividade registrada</p>
                    </div>
                  ) : (
                    filteredActivities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-gray-50">
                        <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700">{activity.content}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">{activity.authorId}</span>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs text-gray-400">{formatDate(activity.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="flex-1 p-6 mt-0">
              <div className="space-y-4">
                {/* Add Task */}
                <div className="flex gap-2">
                  <Input
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Nova tarefa..."
                    className="flex-1 h-9"
                  />
                  <Input
                    type="date"
                    value={newTaskDueDate}
                    onChange={e => setNewTaskDueDate(e.target.value)}
                    className="w-36 h-9"
                  />
                  <Button
                    onClick={handleAddTask}
                    className="bg-[#1e3a5f] hover:bg-[#2d4f7a] h-9"
                    size="sm"
                    disabled={!newTaskTitle.trim() || saving}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Task List */}
                <div className="space-y-2">
                  {dealTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma tarefa</p>
                    </div>
                  ) : (
                    dealTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          task.completed ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'
                        }`}
                      >
                        <button
                          onClick={() => handleToggleTask(task)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            task.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-[#1e3a5f]'
                          }`}
                        >
                          {task.completed && <span className="text-xs">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                            </span>
                            {!task.completed && isTaskOverdue(task.dueDate) && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0">Atrasada</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
