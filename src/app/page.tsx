'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useCRMStore, getTenantId, User } from '@/stores/crm-store'
import { loadAllData, seedDemoData, getAdmins } from '@/lib/crm/firebase-crud'
import { LoginScreen } from '@/components/crm/auth/login-screen'
import { Sidebar } from '@/components/crm/layout/sidebar'
import { Header } from '@/components/crm/layout/header'
import { DashboardPage } from '@/components/crm/dashboard/dashboard-page'
import { FunnelView } from '@/components/crm/funnel/funnel-view'
import { CompaniesPage } from '@/components/crm/companies/companies-page'
import { ContactsPage } from '@/components/crm/contacts/contacts-page'
import { ProductsPage } from '@/components/crm/products/products-page'
import { ProposalsPage } from '@/components/crm/proposals/proposals-page'
import { SettingsPage } from '@/components/crm/settings/settings-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Database, Sparkles, Building2, Shield } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// MainContent — routes to the various page components
// ═══════════════════════════════════════════════════════════════════════════════

function MainContent() {
  const { activeView } = useCRMStore()

  switch (activeView) {
    case 'dashboard':
      return <DashboardPage />
    case 'funnel':
      return <FunnelView />
    case 'companies':
      return <CompaniesPage />
    case 'contacts':
      return <ContactsPage />
    case 'products':
      return <ProductsPage />
    case 'proposals':
      return <ProposalsPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <DashboardPage />
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TenantsOverview — Master sees a list of all admin companies
// ═══════════════════════════════════════════════════════════════════════════════

function TenantsOverview() {
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const loadTenants = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdmins()
      setAdmins(data)
    } catch (err) {
      console.error('Error loading tenants:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const activeAdmins = admins.filter(a => a.active !== false)
  const inactiveAdmins = admins.filter(a => a.active === false)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1e3a5f]">{admins.length}</p>
                <p className="text-xs text-gray-500">Total de Empresas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{activeAdmins.length}</p>
                <p className="text-xs text-gray-500">Empresas Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{inactiveAdmins.length}</p>
                <p className="text-xs text-gray-500">Empresas Inativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Todas as Empresas
        </h3>

        {admins.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhuma empresa cadastrada</p>
            <p className="text-xs mt-1">
              Crie empresas nas Configurações
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map(admin => (
              <div
                key={admin.id}
                className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-sm font-medium shrink-0">
                    {(admin.companyName || admin.name)
                      .split(' ')
                      .map(w => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
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
                      Admin: {admin.name} &bull; {admin.email}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {admin.document && (
                        <span>
                          {(admin.documentType || 'cnpj').toUpperCase()}: {admin.document}
                        </span>
                      )}
                      {admin.companyPhone && <span>{admin.companyPhone}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DemoDataPrompt — shown when there is no data for the current tenant
// Works for Admin and Master
// ═══════════════════════════════════════════════════════════════════════════════

function DemoDataPrompt() {
  const {
    currentUser,
    setFunnels,
    setDeals,
    setCompanies,
    setContacts,
    setProducts,
    setProposals,
    setActivities,
    setTasks,
    setCustomFields,
    setAutomations,
    setUsers,
    setSelectedFunnel,
  } = useCRMStore()
  const [seeding, setSeeding] = useState(false)

  const tenantId = getTenantId(currentUser)

  const handleSeed = async () => {
    if (!tenantId) return
    setSeeding(true)
    try {
      await seedDemoData(tenantId)
      // Reload all data with the same tenantId
      const data = await loadAllData(tenantId)
      setFunnels(data.funnels)
      setDeals(data.deals)
      setCompanies(data.companies)
      setContacts(data.contacts)
      setProducts(data.products)
      setProposals(data.proposals)
      setActivities(data.activities)
      setTasks(data.tasks)
      setCustomFields(data.customFields)
      setAutomations(data.automations)
      setUsers(data.users)

      if (data.funnels.length > 0) {
        setSelectedFunnel(data.funnels[0])
      }
    } catch (error) {
      console.error('Error seeding demo data:', error)
    } finally {
      setSeeding(false)
    }
  }

  const isMaster = currentUser?.role === 'master'

  return (
    <Card className="border-2 border-dashed border-[#1e3a5f]/30 bg-[#1e3a5f]/5">
      <CardContent className="p-6 text-center">
        <Sparkles className="w-10 h-10 text-[#1e3a5f] mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">
          Bem-vindo{isMaster ? ' ao painel Master' : ' ao CRM Pro'}!
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {isMaster
            ? 'Nenhum dado encontrado no sistema. Deseja carregar dados de demonstração para explorar todas as funcionalidades?'
            : 'Seu CRM está vazio. Deseja carregar dados de demonstração para explorar todas as funcionalidades?'}
        </p>
        <Button
          onClick={handleSeed}
          className="bg-[#1e3a5f] hover:bg-[#2d4f7a]"
          disabled={seeding}
        >
          {seeding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Carregando dados...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Carregar Dados de Demo
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Home — main page component
// ═══════════════════════════════════════════════════════════════════════════════

export default function Home() {
  const {
    isAuthenticated,
    currentUser,
    setLoading,
    loading,
    funnels,
    companies,
    activeViewMaster,
    activeView,
    setActiveView,
    setFunnels,
    setDeals,
    setCompanies,
    setContacts,
    setProducts,
    setProposals,
    setActivities,
    setTasks,
    setCustomFields,
    setAutomations,
    setUsers,
    setSelectedFunnel,
  } = useCRMStore()

  const [initialLoading, setInitialLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Compute tenantId from current user
  const tenantId = getTenantId(currentUser)
  const isMaster = currentUser?.role === 'master'

  // Load data once authenticated, filtered by tenantId
  useEffect(() => {
    if (!isAuthenticated || dataLoaded) return

    const loadData = async () => {
      setLoading(true)
      try {
        const data = await loadAllData(tenantId)
        setFunnels(data.funnels)
        setDeals(data.deals)
        setCompanies(data.companies)
        setContacts(data.contacts)
        setProducts(data.products)
        setProposals(data.proposals)
        setActivities(data.activities)
        setTasks(data.tasks)
        setCustomFields(data.customFields)
        setAutomations(data.automations)
        setUsers(data.users)

        // Set default selected funnel
        if (data.funnels.length > 0) {
          setSelectedFunnel(data.funnels[0])
        }

        setDataLoaded(true)
      } catch (error) {
        console.error('Error loading data:', error)
        setDataLoaded(true) // Mark as loaded even on error so UI doesn't stay stuck
      } finally {
        setLoading(false)
        setInitialLoading(false)
      }
    }

    loadData()
  }, [isAuthenticated, dataLoaded]) // tenantId is read inside the effect intentionally

  // Initial loading timeout fallback
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  // If Master and no activeViewMaster is set, default to normal dashboard
  // (redirect Master to the regular CRM view rather than showing empty tenants)
  useEffect(() => {
    if (isMaster && !activeViewMaster) {
      // Master defaults to the regular dashboard view
      // They can navigate to 'tenants' via the sidebar when available
    }
  }, [isMaster, activeViewMaster])

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />
  }

  // Loading state
  if (initialLoading || (loading && !dataLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      </div>
    )
  }

  // Determine if we have no data (to show demo prompt)
  // Check against the current tenant's data: for master, check globally; for admin/user, check their tenant
  const hasData = funnels.length > 0 || companies.length > 0

  // For Master: if activeViewMaster === 'tenants', show TenantsOverview
  // Otherwise show the regular MainContent
  const showTenantsView = isMaster && activeViewMaster === 'tenants'

  return (
    <div className="h-screen flex overflow-hidden bg-[#f5f6fa]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Master Tenants Overview */}
          {showTenantsView ? (
            <TenantsOverview />
          ) : (
            <>
              {/* Show demo data prompt if no data exists for this tenant */}
              {!hasData && (
                <div className="mb-6">
                  <DemoDataPrompt />
                </div>
              )}

              <MainContent />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
