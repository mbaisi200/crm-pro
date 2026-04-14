'use client'

import React, { useMemo } from 'react'
import { useCRMStore } from '@/stores/crm-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  TrendingUp,
  HandshakeIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#6366f1', '#f59e0b', '#3b82f6', '#f97316', '#22c55e']

export function DashboardPage() {
  const { deals, companies, contacts, funnels, activities, tasks, currentUser, users } = useCRMStore()

  // ── Header info based on role ──────────────────────────────────────────
  const headerInfo = useMemo(() => {
    if (!currentUser) return { title: 'Dashboard', subtitle: '' }
    if (currentUser.role === 'master') {
      return { title: 'Painel Master - Visão Geral', subtitle: 'Todas as Empresas' }
    }
    const companyName = currentUser.companyName || 'Empresa'
    return { title: 'Dashboard', subtitle: companyName }
  }, [currentUser])

  // ── Master-only: count of admin users (companies) ──────────────────────
  const adminCount = useMemo(() => {
    if (!currentUser || currentUser.role !== 'master') return 0
    return users.filter(u => u.role === 'admin').length
  }, [currentUser, users])

  // ── KPIs (data already filtered by tenantId from page.tsx) ────────────
  const kpis = useMemo(() => {
    const totalDeals = deals.length
    const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)

    // Get the last stage of the first funnel as "won"
    const wonStageId = funnels.length > 0
      ? funnels[0].stages?.reduce((a, b) => (a.order > b.order ? a : b), funnels[0].stages[0])?.id
      : null

    const wonDeals = deals.filter(d => d.stageId === wonStageId)
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    const conversionRate = totalDeals > 0 ? ((wonDeals.length / totalDeals) * 100).toFixed(1) : '0'

    return { totalDeals, totalValue, wonDeals: wonDeals.length, wonValue, conversionRate }
  }, [deals, funnels])

  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return months.map((month, i) => ({
      name: month,
      valor: Math.floor(Math.random() * 80000 + 20000) + (i * 5000),
      negocios: Math.floor(Math.random() * 8 + 2),
    }))
  }, [])

  const funnelChartData = useMemo(() => {
    if (funnels.length === 0) return []
    const funnel = funnels[0]
    return (funnel.stages || []).map((stage, i) => ({
      name: stage.name,
      value: deals.filter(d => d.stageId === stage.id).length,
      color: COLORS[i % COLORS.length],
    }))
  }, [funnels, deals])

  const recentActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0
        return dateB - dateA
      })
      .slice(0, 6)
  }, [activities])

  const pendingTasks = useMemo(() => {
    return tasks
      .filter(t => !t.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
  }, [tasks])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note': return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'email': return <span className="text-xs">📧</span>
      case 'whatsapp': return <span className="text-xs">💬</span>
      case 'call': return <span className="text-xs">📞</span>
      case 'meeting': return <span className="text-xs">🤝</span>
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const isTaskOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#1e3a5f]">{headerInfo.title}</h2>
        {headerInfo.subtitle && (
          <p className="text-sm text-gray-500 mt-1">{headerInfo.subtitle}</p>
        )}
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${currentUser?.role === 'master' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        {currentUser?.role === 'master' && (
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total de Empresas (Admins)</p>
                  <p className="text-3xl font-bold text-[#1e3a5f] mt-1">{adminCount}</p>
                  <div className="flex items-center mt-2 text-gray-500 text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    Empresas cadastradas
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Negócios</p>
                <p className="text-3xl font-bold text-[#1e3a5f] mt-1">{kpis.totalDeals}</p>
                <div className="flex items-center mt-2 text-green-600 text-xs">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +12% vs mês anterior
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <HandshakeIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Valor no Funil</p>
                <p className="text-3xl font-bold text-[#1e3a5f] mt-1">{formatCurrency(kpis.totalValue)}</p>
                <div className="flex items-center mt-2 text-green-600 text-xs">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +8% vs mês anterior
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-[#1e3a5f] mt-1">{kpis.conversionRate}%</p>
                <div className="flex items-center mt-2 text-red-500 text-xs">
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                  -2% vs mês anterior
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Negócios Ganho</p>
                <p className="text-3xl font-bold text-[#1e3a5f] mt-1">{kpis.wonDeals}</p>
                <div className="flex items-center mt-2 text-green-600 text-xs">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +3 este mês
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#1e3a5f]">Negócios por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="valor" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#1e3a5f]">Distribuição no Funil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={funnelChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {funnelChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 mt-2">
              {funnelChartData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#1e3a5f]">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma atividade registrada</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{activity.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{activity.authorId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#1e3a5f]">Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma tarefa pendente</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className={`w-2 h-2 rounded-full ${isTaskOverdue(task.dueDate) ? 'bg-red-500' : 'bg-green-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        {isTaskOverdue(task.dueDate) && (
                          <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">Atrasada</Badge>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{task.assigneeId}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1e3a5f] to-[#2d4f7a] text-white">
          <CardContent className="p-4">
            <p className="text-sm text-blue-200">Empresas</p>
            <p className="text-2xl font-bold mt-1">{companies.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#3b5998] to-[#4a6fb5] text-white">
          <CardContent className="p-4">
            <p className="text-sm text-blue-200">Contatos</p>
            <p className="text-2xl font-bold mt-1">{contacts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#4a7c59] to-[#5a9a6a] text-white">
          <CardContent className="p-4">
            <p className="text-sm text-green-200">Produtos</p>
            <p className="text-2xl font-bold mt-1">{useCRMStore.getState().products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#7c4a4a] to-[#9a5a5a] text-white">
          <CardContent className="p-4">
            <p className="text-sm text-red-200">Tarefas Atrasadas</p>
            <p className="text-2xl font-bold mt-1">
              {tasks.filter(t => !t.completed && isTaskOverdue(t.dueDate)).length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
