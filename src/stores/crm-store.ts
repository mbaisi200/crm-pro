import { create } from 'zustand'

export type ViewType = 'dashboard' | 'funnel' | 'companies' | 'contacts' | 'products' | 'proposals' | 'settings'

export interface User {
  id: string
  email: string
  name: string
  role: 'master' | 'admin'
  createdAt: any
}

export interface Funnel {
  id: string
  name: string
  stages: Stage[]
  createdAt: any
}

export interface Stage {
  id: string
  name: string
  color: string
  order: number
}

export interface Deal {
  id: string
  title: string
  value: number
  companyId: string
  contactId: string
  funnelId: string
  stageId: string
  owner: string
  products: string[]
  customFields: Record<string, any>
  createdAt: any
  updatedAt: any
}

export interface Company {
  id: string
  name: string
  cnpj: string
  industry: string
  phone: string
  email: string
  address: string
  website: string
  owner: string
  customFields: Record<string, any>
  createdAt: any
}

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  position: string
  companyId: string
  owner: string
  customFields: Record<string, any>
  createdAt: any
}

export interface Product {
  id: string
  name: string
  sku: string
  price: number
  description: string
  category: string
  createdAt: any
}

export interface Proposal {
  id: string
  title: string
  dealId: string
  clientId: string
  template: string
  content: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  createdAt: any
}

export interface Activity {
  id: string
  type: 'note' | 'email' | 'whatsapp' | 'call' | 'meeting'
  dealId: string
  authorId: string
  content: string
  createdAt: any
}

export interface Task {
  id: string
  dealId: string
  title: string
  dueDate: string
  completed: boolean
  assigneeId: string
  createdAt: any
}

export interface CustomField {
  id: string
  module: string
  name: string
  type: 'text' | 'date' | 'select' | 'formula'
  options: string[]
  createdAt: any
}

export interface Automation {
  id: string
  trigger: string
  conditions: string
  actions: string
  active: boolean
  createdAt: any
}

interface CRMState {
  // Auth
  isAuthenticated: boolean
  currentUser: User | null
  setUser: (user: User | null) => void
  logout: () => void

  // Navigation
  activeView: ViewType
  setActiveView: (view: ViewType) => void

  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Funnel
  selectedFunnel: Funnel | null
  setSelectedFunnel: (funnel: Funnel | null) => void

  // Deal detail
  selectedDeal: Deal | null
  setSelectedDeal: (deal: Deal | null) => void

  // Data
  funnels: Funnel[]
  setFunnels: (funnels: Funnel[]) => void
  deals: Deal[]
  setDeals: (deals: Deal[]) => void
  companies: Company[]
  setCompanies: (companies: Company[]) => void
  contacts: Contact[]
  setContacts: (contacts: Contact[]) => void
  products: Product[]
  setProducts: (products: Product[]) => void
  proposals: Proposal[]
  setProposals: (proposals: Proposal[]) => void
  activities: Activity[]
  setActivities: (activities: Activity[]) => void
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  customFields: CustomField[]
  setCustomFields: (fields: CustomField[]) => void
  automations: Automation[]
  setAutomations: (automations: Automation[]) => void
  users: User[]
  setUsers: (users: User[]) => void

  // Loading
  loading: boolean
  setLoading: (loading: boolean) => void

  // Demo data seeded
  demoSeeded: boolean
  setDemoSeeded: (seeded: boolean) => void
}

export const useCRMStore = create<CRMState>((set) => ({
  // Auth
  isAuthenticated: false,
  currentUser: null,
  setUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  logout: () => set({ currentUser: null, isAuthenticated: false, activeView: 'dashboard', selectedDeal: null, selectedFunnel: null }),

  // Navigation
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Funnel
  selectedFunnel: null,
  setSelectedFunnel: (funnel) => set({ selectedFunnel: funnel }),

  // Deal detail
  selectedDeal: null,
  setSelectedDeal: (deal) => set({ selectedDeal: deal }),

  // Data
  funnels: [],
  setFunnels: (funnels) => set({ funnels }),
  deals: [],
  setDeals: (deals) => set({ deals }),
  companies: [],
  setCompanies: (companies) => set({ companies }),
  contacts: [],
  setContacts: (contacts) => set({ contacts }),
  products: [],
  setProducts: (products) => set({ products }),
  proposals: [],
  setProposals: (proposals) => set({ proposals }),
  activities: [],
  setActivities: (activities) => set({ activities }),
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  customFields: [],
  setCustomFields: (fields) => set({ customFields: fields }),
  automations: [],
  setAutomations: (automations) => set({ automations }),
  users: [],
  setUsers: (users) => set({ users }),

  // Loading
  loading: false,
  setLoading: (loading) => set({ loading }),

  // Demo seeded
  demoSeeded: false,
  setDemoSeeded: (seeded) => set({ demoSeeded: seeded }),
}))
