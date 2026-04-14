'use client'

import React from 'react'
import { useCRMStore, ViewType } from '@/stores/crm-store'
import {
  LayoutDashboard,
  Kanban,
  Building2,
  Users,
  Package,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ── Nav item type supporting both regular and master views ─────────────────
interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  view?: ViewType
  masterView?: 'tenants'
}

// ── Shared base items ─────────────────────────────────────────────────────
const baseNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { id: 'funnel', label: 'Funil', icon: Kanban, view: 'funnel' },
  { id: 'companies', label: 'Empresas', icon: Building2, view: 'companies' },
  { id: 'contacts', label: 'Contatos', icon: Users, view: 'contacts' },
  { id: 'products', label: 'Produtos', icon: Package, view: 'products' },
  { id: 'proposals', label: 'Propostas', icon: FileText, view: 'proposals' },
]

// Items only visible to admin & master roles
const adminOnlyItems: NavItem[] = [
  { id: 'settings', label: 'Configurações', icon: Settings, view: 'settings' },
]

// Items exclusive to the master role
const masterOnlyItems: NavItem[] = [
  { id: 'tenants', label: 'Empresas (Admins)', icon: Shield, masterView: 'tenants' },
]

export function Sidebar() {
  const {
    activeView,
    setActiveView,
    activeViewMaster,
    setActiveViewMaster,
    sidebarCollapsed,
    toggleSidebar,
    currentUser,
    logout,
  } = useCRMStore()

  const initials = currentUser?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  // ── Build nav items based on role ──────────────────────────────────────
  const navItems = React.useMemo(() => {
    const role = currentUser?.role

    if (role === 'master') {
      return [
        { ...baseNavItems[0] },                                                       // Dashboard
        ...masterOnlyItems,                                                             // Empresas (Admins)
        { ...baseNavItems[1], label: 'Funis' },                                        // Funis (plural for master)
        ...baseNavItems.slice(2),                                                      // Empresas, Contatos, Produtos, Propostas
        ...adminOnlyItems,                                                             // Configurações
      ]
    }

    if (role === 'admin') {
      return [...baseNavItems, ...adminOnlyItems]
    }

    // Regular user — no Configurações
    return baseNavItems
  }, [currentUser?.role])

  // ── Helpers ────────────────────────────────────────────────────────────
  const isItemActive = (item: NavItem) => {
    if (item.masterView) return activeViewMaster === item.masterView
    return activeView === item.view
  }

  const handleNavClick = (item: NavItem) => {
    if (item.masterView) {
      setActiveViewMaster(item.masterView)
    } else if (item.view) {
      setActiveView(item.view)
    }
  }

  // ── Role badge configuration ──────────────────────────────────────────
  const roleBadge = React.useMemo(() => {
    const role = currentUser?.role
    if (role === 'master') return { label: 'MASTER', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' }
    if (role === 'admin')   return { label: 'ADMIN',  className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }
    if (role === 'user')    return { label: 'USUÁRIO', className: 'bg-gray-400/20 text-gray-300 border-gray-400/30' }
    return null
  }, [currentUser?.role])

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-[#1e3a5f] text-white transition-all duration-300 relative',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-white/10',
        sidebarCollapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 flex-shrink-0">
          <Zap className="w-5 h-5 text-blue-300" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold tracking-tight">CRM Pro</h1>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = isItemActive(item)
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white',
                sidebarCollapsed && 'justify-center px-0'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* User avatar / logout */}
      <div className="border-t border-white/10 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/10 transition-colors',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <Avatar className="w-8 h-8 border-2 border-white/30">
                <AvatarFallback className="bg-[#2d4f7a] text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{currentUser?.name || 'Usuário'}</p>
                    {roleBadge && (
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none whitespace-nowrap flex-shrink-0',
                          roleBadge.className
                        )}
                      >
                        {roleBadge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-300 truncate">{currentUser?.email || ''}</p>
                  {currentUser && currentUser.role !== 'master' && currentUser.companyName && (
                    <p className="text-xs text-blue-200/70 truncate mt-0.5">{currentUser.companyName}</p>
                  )}
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await signOut(auth)
                } catch (e) { /* noop */ }
                logout()
              }}
              className="text-red-600 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1e3a5f] border border-white/20 flex items-center justify-center text-white hover:bg-[#2d4f7a] transition-colors shadow-md z-10"
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}
