'use client'

import React from 'react'
import { useCRMStore, ViewType } from '@/stores/crm-store'
import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const viewTitles: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  funnel: 'Funil de Vendas',
  companies: 'Empresas',
  contacts: 'Contatos',
  products: 'Produtos & Serviços',
  proposals: 'Propostas',
  settings: 'Configurações',
}

export function Header() {
  const { activeView } = useCRMStore()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h2 className="text-xl font-semibold text-[#1e3a5f]">{viewTitles[activeView]}</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar..."
            className="pl-9 w-64 h-9 bg-gray-50 border-gray-200 text-sm"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
      </div>
    </header>
  )
}
