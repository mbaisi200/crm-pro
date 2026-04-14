'use client'

import React, { useEffect, useState } from 'react'
import { useCRMStore } from '@/stores/crm-store'
import { loadAllData, seedDemoData } from '@/lib/crm/firebase-crud'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Database, Sparkles } from 'lucide-react'

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

function DemoDataPrompt() {
  const { setDeals, setCompanies, setContacts, setProducts, setFunnels, setActivities, setTasks, setDemoSeeded, demoSeeded } = useCRMStore()
  const [seeding, setSeeding] = useState(false)

  if (demoSeeded) return null

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await seedDemoData()
      const data = await loadAllData()
      setFunnels(data.funnels)
      setDeals(data.deals)
      setCompanies(data.companies)
      setContacts(data.contacts)
      setProducts(data.products)
      setActivities(data.activities)
      setTasks(data.tasks)
      setDemoSeeded(true)
    } catch (error) {
      console.error('Error seeding demo data:', error)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <Card className="border-2 border-dashed border-[#1e3a5f]/30 bg-[#1e3a5f]/5">
      <CardContent className="p-6 text-center">
        <Sparkles className="w-10 h-10 text-[#1e3a5f] mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">Bem-vindo ao CRM Pro!</h3>
        <p className="text-sm text-gray-500 mb-4">
          Seu CRM está vazio. Deseja carregar dados de demonstração para explorar todas as funcionalidades?
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

export default function Home() {
  const {
    isAuthenticated,
    currentUser,
    setUser,
    setLoading,
    loading,
    funnels,
    deals,
    companies,
    contacts,
    products,
    proposals,
    activities,
    tasks,
    customFields,
    automations,
    users,
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
    demoSeeded,
  } = useCRMStore()

  const [initialLoading, setInitialLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Load data once authenticated
  useEffect(() => {
    if (!isAuthenticated || dataLoaded) return

    const loadData = async () => {
      setLoading(true)
      try {
        const data = await loadAllData()
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

        // Check if there's any data - if not, mark that we need demo prompt
        if (data.funnels.length === 0 && data.companies.length === 0) {
          // Will show demo data prompt
        } else {
          useCRMStore.getState().setDemoSeeded(true)
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
  }, [isAuthenticated, dataLoaded])

  // Initial loading check
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

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

  const hasData = funnels.length > 0 || companies.length > 0 || deals.length > 0

  return (
    <div className="h-screen flex overflow-hidden bg-[#f5f6fa]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Show demo data prompt if no data */}
          {!hasData && !demoSeeded && (
            <div className="mb-6">
              <DemoDataPrompt />
            </div>
          )}

          <MainContent />
        </main>
      </div>
    </div>
  )
}
