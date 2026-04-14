import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  QueryConstraint,
} from 'firebase/firestore'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { MASTER_EMAIL, getTenantId } from '@/stores/crm-store'
import type {
  User,
  Funnel,
  Deal,
  Company,
  Contact,
  Product,
  Proposal,
  Activity,
  Task,
  CustomField,
  Automation,
} from '@/stores/crm-store'

// ════════════════════════════════════════════════════════════════════════════
// PASSWORD HASHING
// ════════════════════════════════════════════════════════════════════════════

/** Simple SHA-256 hash for admin/user passwords (not crypto-grade, but better than plaintext) */
export async function simpleHash(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'crm-salt-2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ════════════════════════════════════════════════════════════════════════════

/** Login master via Firebase Authentication */
export async function loginMaster(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return { success: true, uid: userCredential.user.uid, email: userCredential.user.email }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/** Login admin/user via Firestore user doc + password hash */
export async function loginAdmin(email: string, password: string) {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email))
    const snapshot = await getDocs(q)
    if (snapshot.empty) {
      return { success: false, error: 'Usuário não encontrado' }
    }
    const userDoc = snapshot.docs[0]
    const userData = userDoc.data()
    const hashedPassword = await simpleHash(password)
    if (userData.password !== hashedPassword) {
      return { success: false, error: 'Senha incorreta' }
    }
    return {
      success: true,
      uid: userDoc.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      companyId: userData.companyId,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Register a master user.
 * Checks if a master with the same email already exists in Firestore BEFORE creating.
 * If exists, returns that user's ID instead of creating a duplicate.
 */
export async function registerMaster(email: string, password: string) {
  try {
    // Check if a master user with this email already exists in Firestore
    const usersRef = collection(db, 'users')
    const checkQuery = query(usersRef, where('email', '==', email), where('role', '==', 'master'))
    const existingSnapshot = await getDocs(checkQuery)

    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0]
      // Already exists — return the existing user's ID
      return { success: true, uid: existingDoc.id, existing: true }
    }

    // Create in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const hashedPassword = await simpleHash(password)

    // Create Firestore user doc
    await addDoc(collection(db, 'users'), {
      email,
      name: 'Master Admin',
      role: 'master',
      password: hashedPassword,
      companyId: '',
      companyName: '',
      documentType: 'cnpj' as const,
      document: '',
      companyPhone: '',
      companyAddress: '',
      active: true,
      createdAt: serverTimestamp(),
    })

    return { success: true, uid: userCredential.user.uid }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ADMIN & COMPANY USER REGISTRATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Register an admin user with company data.
 * The admin's companyId is set to their own Firestore document ID (self-reference).
 */
export async function registerAdmin(data: {
  name: string
  email: string
  password: string
  companyName: string
  documentType: 'cnpj' | 'cpf'
  document: string
  companyPhone: string
  companyAddress: string
}) {
  try {
    const hashedPassword = await simpleHash(data.password)

    const docRef = await addDoc(collection(db, 'users'), {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'admin',
      companyId: '', // placeholder — will update to self-reference below
      companyName: data.companyName,
      documentType: data.documentType,
      document: data.document,
      companyPhone: data.companyPhone,
      companyAddress: data.companyAddress,
      active: true,
      createdAt: serverTimestamp(),
    })

    // Set companyId to the new doc's ID (self-reference)
    await updateDoc(doc(db, 'users', docRef.id), { companyId: docRef.id })

    return { success: true, userId: docRef.id, companyId: docRef.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Register a company user (admin creates users under their company).
 */
export async function registerCompanyUser(data: {
  name: string
  email: string
  password: string
  companyId: string
}) {
  try {
    const hashedPassword = await simpleHash(data.password)

    const docRef = await addDoc(collection(db, 'users'), {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'user',
      companyId: data.companyId,
      companyName: '',
      documentType: 'cpf' as const,
      document: '',
      companyPhone: '',
      companyAddress: '',
      active: true,
      createdAt: serverTimestamp(),
    })

    return { success: true, userId: docRef.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GENERIC CRUD (with tenant isolation)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get all documents from a collection, optionally filtered by tenantId.
 * If tenantId is provided, queries with `where('tenantId', '==', tenantId)`.
 */
async function getAll<T>(collectionName: string, tenantId?: string | null): Promise<T[]> {
  const colRef = collection(db, collectionName)
  const constraints: QueryConstraint[] = []
  if (tenantId && tenantId !== 'master') {
    constraints.push(where('tenantId', '==', tenantId))
  }
  const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T))
}

/** Get a single document by ID */
async function getById<T>(collectionName: string, id: string): Promise<T | null> {
  const docRef = doc(db, collectionName, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as T
}

/**
 * Create a document. The caller must include `tenantId` in the data object
 * for tenant-scoped collections. Automatically attaches `createdAt`.
 */
async function create<T>(collectionName: string, data: Record<string, any>): Promise<string> {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

/** Update a document. Automatically attaches `updatedAt`. */
async function update(collectionName: string, id: string, data: Record<string, any>): Promise<void> {
  const docRef = doc(db, collectionName, id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/** Delete a document by ID */
async function remove(collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, collectionName, id)
  await deleteDoc(docRef)
}

// ════════════════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get users. If tenantId is provided, filters by companyId === tenantId.
 * Users use `companyId` for tenant isolation, not the `tenantId` field.
 */
export async function getUsers(tenantId?: string | null): Promise<User[]> {
  if (tenantId && tenantId !== 'master') {
    const q = query(collection(db, 'users'), where('companyId', '==', tenantId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User))
  }
  // No filter — return all
  return getAll<User>('users')
}

/** Get users belonging to a specific tenant (company) */
export const getUsersByTenant = (tenantId: string) => getUsers(tenantId)

/** Get all admin users (for Master to manage) */
export async function getAdmins(): Promise<User[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'admin'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User))
}

/** Create a user document */
export const createUser = (data: Record<string, any>) => create('users', data)

/** Update a user document */
export const updateUser = (id: string, data: Record<string, any>) => update('users', id, data)

/** Delete a user document */
export const deleteUser = (id: string) => remove('users', id)

// ════════════════════════════════════════════════════════════════════════════
// FUNNELS
// ════════════════════════════════════════════════════════════════════════════

export const getFunnels = (tenantId?: string | null) => getAll<Funnel>('funnels', tenantId)
export const createFunnel = (data: Record<string, any>) => create('funnels', data)
export const updateFunnel = (id: string, data: Record<string, any>) => update('funnels', id, data)
export const deleteFunnel = (id: string) => remove('funnels', id)

// ════════════════════════════════════════════════════════════════════════════
// DEALS
// ════════════════════════════════════════════════════════════════════════════

export const getDeals = (tenantId?: string | null) => getAll<Deal>('deals', tenantId)

export const getDealsByFunnel = async (funnelId: string, tenantId?: string): Promise<Deal[]> => {
  const constraints: QueryConstraint[] = [where('funnelId', '==', funnelId)]
  if (tenantId && tenantId !== 'master') {
    constraints.push(where('tenantId', '==', tenantId))
  }
  const q = query(collection(db, 'deals'), ...constraints)
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Deal))
}

export const createDeal = (data: Record<string, any>) => create('deals', data)
export const updateDeal = (id: string, data: Record<string, any>) => update('deals', id, data)
export const deleteDeal = (id: string) => remove('deals', id)

// ════════════════════════════════════════════════════════════════════════════
// COMPANIES
// ════════════════════════════════════════════════════════════════════════════

export const getCompanies = (tenantId?: string | null) => getAll<Company>('companies', tenantId)
export const createCompany = (data: Record<string, any>) => create('companies', data)
export const updateCompany = (id: string, data: Record<string, any>) => update('companies', id, data)
export const deleteCompany = (id: string) => remove('companies', id)

// ════════════════════════════════════════════════════════════════════════════
// CONTACTS
// ════════════════════════════════════════════════════════════════════════════

export const getContacts = (tenantId?: string | null) => getAll<Contact>('contacts', tenantId)
export const createContact = (data: Record<string, any>) => create('contacts', data)
export const updateContact = (id: string, data: Record<string, any>) => update('contacts', id, data)
export const deleteContact = (id: string) => remove('contacts', id)

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════════════════

export const getProducts = (tenantId?: string | null) => getAll<Product>('products', tenantId)
export const createProduct = (data: Record<string, any>) => create('products', data)
export const updateProduct = (id: string, data: Record<string, any>) => update('products', id, data)
export const deleteProduct = (id: string) => remove('products', id)

// ════════════════════════════════════════════════════════════════════════════
// PROPOSALS
// ════════════════════════════════════════════════════════════════════════════

export const getProposals = (tenantId?: string | null) => getAll<Proposal>('proposals', tenantId)
export const createProposal = (data: Record<string, any>) => create('proposals', data)
export const updateProposal = (id: string, data: Record<string, any>) => update('proposals', id, data)
export const deleteProposal = (id: string) => remove('proposals', id)

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITIES
// ════════════════════════════════════════════════════════════════════════════

export const getActivities = (tenantId?: string | null) => getAll<Activity>('activities', tenantId)

export const getActivitiesByDeal = async (dealId: string, tenantId?: string): Promise<Activity[]> => {
  const constraints: QueryConstraint[] = [where('dealId', '==', dealId)]
  if (tenantId && tenantId !== 'master') {
    constraints.push(where('tenantId', '==', tenantId))
  }
  const q = query(collection(db, 'activities'), ...constraints)
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Activity))
}

export const createActivity = (data: Record<string, any>) => create('activities', data)

// ════════════════════════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════════════════════════

export const getTasks = (tenantId?: string | null) => getAll<Task>('tasks', tenantId)

export const getTasksByDeal = async (dealId: string, tenantId?: string): Promise<Task[]> => {
  const constraints: QueryConstraint[] = [where('dealId', '==', dealId)]
  if (tenantId && tenantId !== 'master') {
    constraints.push(where('tenantId', '==', tenantId))
  }
  const q = query(collection(db, 'tasks'), ...constraints)
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Task))
}

export const createTask = (data: Record<string, any>) => create('tasks', data)
export const updateTask = (id: string, data: Record<string, any>) => update('tasks', id, data)
export const deleteTask = (id: string) => remove('tasks', id)

// ════════════════════════════════════════════════════════════════════════════
// CUSTOM FIELDS
// ════════════════════════════════════════════════════════════════════════════

export const getCustomFields = (tenantId?: string | null) => getAll<CustomField>('customFields', tenantId)
export const createCustomField = (data: Record<string, any>) => create('customFields', data)
export const updateCustomField = (id: string, data: Record<string, any>) => update('customFields', id, data)
export const deleteCustomField = (id: string) => remove('customFields', id)

// ════════════════════════════════════════════════════════════════════════════
// AUTOMATIONS
// ════════════════════════════════════════════════════════════════════════════

export const getAutomations = (tenantId?: string | null) => getAll<Automation>('automations', tenantId)
export const createAutomation = (data: Record<string, any>) => create('automations', data)
export const updateAutomation = (id: string, data: Record<string, any>) => update('automations', id, data)
export const deleteAutomation = (id: string) => remove('automations', id)

// ════════════════════════════════════════════════════════════════════════════
// REAL-TIME LISTENERS
// ════════════════════════════════════════════════════════════════════════════

/** Subscribe to deals in real-time, optionally filtered by tenant */
export function subscribeToDeals(
  callback: (deals: Deal[]) => void,
  tenantId?: string,
): () => void {
  const constraints: QueryConstraint[] = []
  if (tenantId && tenantId !== 'master') {
    constraints.push(where('tenantId', '==', tenantId))
  }
  const q = constraints.length > 0
    ? query(collection(db, 'deals'), ...constraints)
    : collection(db, 'deals')
  return onSnapshot(q, (snapshot) => {
    const deals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Deal))
    callback(deals)
  })
}

/** Subscribe to activities for a specific deal in real-time */
export function subscribeToActivities(
  dealId: string,
  callback: (activities: Activity[]) => void,
  tenantId?: string,
): () => void {
  const constraints: QueryConstraint[] = [where('dealId', '==', dealId)]
  if (tenantId && tenantId !== 'master') {
    constraints.push(where('tenantId', '==', tenantId))
  }
  const q = query(collection(db, 'activities'), ...constraints)
  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Activity))
    callback(activities)
  })
}

// ════════════════════════════════════════════════════════════════════════════
// SEED DEMO DATA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Seed demo data for a specific tenant.
 * Every document created includes the tenantId field.
 * Optional `overrides` can replace entire data sections (e.g. companies, contacts).
 */
export async function seedDemoData(
  tenantId?: string,
  overrides?: {
    funnel?: Partial<Funnel>
    companies?: Array<Partial<Company> & { name: string }>
    contacts?: Array<Partial<Contact> & { name: string }>
    products?: Array<Partial<Product> & { name: string }>
  },
) {
  try {
    // ── Funnel ──────────────────────────────────────────────────────────
    const funnelId = await createFunnel({
      name: overrides?.funnel?.name || 'Funil de Vendas',
      stages: overrides?.funnel?.stages || [
        { id: 'stage-1', name: 'Lead', color: '#6366f1', order: 1 },
        { id: 'stage-2', name: 'Qualificação', color: '#f59e0b', order: 2 },
        { id: 'stage-3', name: 'Proposta', color: '#3b82f6', order: 3 },
        { id: 'stage-4', name: 'Negociação', color: '#f97316', order: 4 },
        { id: 'stage-5', name: 'Fechamento', color: '#22c55e', order: 5 },
      ],
      ...(tenantId ? { tenantId } : {}),
    })

    // ── Companies ───────────────────────────────────────────────────────
    const defaultCompanies = [
      { name: 'TechVision Ltda', cnpj: '12.345.678/0001-90', industry: 'Tecnologia', phone: '(11) 3456-7890', email: 'contato@techvision.com.br', address: 'Av. Paulista, 1000 - São Paulo/SP', website: 'www.techvision.com.br', owner: 'Carlos Silva', customFields: {} },
      { name: 'GreenBuild Construtora', cnpj: '23.456.789/0001-01', industry: 'Construção', phone: '(21) 2345-6789', email: 'comercial@greenbuild.com.br', address: 'Rua da Assembleia, 50 - Rio de Janeiro/RJ', website: 'www.greenbuild.com.br', owner: 'Ana Costa', customFields: {} },
      { name: 'MegaFood Alimentos', cnpj: '34.567.890/0001-12', industry: 'Alimentício', phone: '(31) 3456-7891', email: 'vendas@megafood.com.br', address: 'Av. Afonso Pena, 200 - Belo Horizonte/MG', website: 'www.megafood.com.br', owner: 'Carlos Silva', customFields: {} },
      { name: 'EduPlus Educação', cnpj: '45.678.901/0001-23', industry: 'Educação', phone: '(41) 3456-7892', email: 'contato@eduplus.com.br', address: 'Rua XV de Novembro, 300 - Curitiba/PR', website: 'www.eduplus.com.br', owner: 'Maria Santos', customFields: {} },
      { name: 'LogiTrans Logística', cnpj: '56.789.012/0001-34', industry: 'Logística', phone: '(51) 3456-7893', email: 'operacional@logitrans.com.br', address: 'Porto Seco, 100 - Porto Alegre/RS', website: 'www.logitrans.com.br', owner: 'Ana Costa', customFields: {} },
    ]

    const companies = overrides?.companies || defaultCompanies
    const companyIds: string[] = []
    for (const company of companies) {
      const id = await createCompany({
        ...defaultCompanies[0], // base defaults
        ...company,              // override with provided data (or defaults)
        ...(tenantId ? { tenantId } : {}),
      })
      companyIds.push(id)
    }

    // ── Contacts ────────────────────────────────────────────────────────
    const defaultContacts = [
      { name: 'Roberto Almeida', email: 'roberto@techvision.com.br', phone: '(11) 98765-4321', position: 'Diretor Comercial', companyId: companyIds[0], owner: 'Carlos Silva', customFields: {} },
      { name: 'Fernanda Lima', email: 'fernanda@greenbuild.com.br', phone: '(21) 98765-4322', position: 'Gerente de Projetos', companyId: companyIds[1], owner: 'Ana Costa', customFields: {} },
      { name: 'Paulo Mendes', email: 'paulo@megafood.com.br', phone: '(31) 98765-4323', position: 'CEO', companyId: companyIds[2], owner: 'Carlos Silva', customFields: {} },
      { name: 'Lucia Ferreira', email: 'lucia@eduplus.com.br', phone: '(41) 98765-4324', position: 'Coordenadora', companyId: companyIds[3], owner: 'Maria Santos', customFields: {} },
      { name: 'Marcos Oliveira', email: 'marcos@logitrans.com.br', phone: '(51) 98765-4325', position: 'Diretor de Operações', companyId: companyIds[4], owner: 'Ana Costa', customFields: {} },
    ]

    const contacts = overrides?.contacts || defaultContacts
    const contactIds: string[] = []
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i]
      const id = await createContact({
        ...c,
        companyId: c.companyId || companyIds[i % companyIds.length],
        ...(tenantId ? { tenantId } : {}),
      })
      contactIds.push(id)
    }

    // ── Products ────────────────────────────────────────────────────────
    const defaultProducts = [
      { name: 'Licença Enterprise', sku: 'LIC-ENT-001', price: 25000, description: 'Licença anual do sistema enterprise', category: 'Software' },
      { name: 'Consultoria Estratégica', sku: 'CONS-EST-001', price: 15000, description: 'Pacote de 40h de consultoria', category: 'Serviço' },
      { name: 'Implementação Customizada', sku: 'IMP-CUS-001', price: 45000, description: 'Implementação com customizações', category: 'Serviço' },
      { name: 'Suporte Premium', sku: 'SUP-PRE-001', price: 8000, description: 'Suporte 24/7 por 12 meses', category: 'Serviço' },
      { name: 'Treinamento Corporativo', sku: 'TRE-COR-001', price: 5000, description: 'Treinamento para equipe completa', category: 'Treinamento' },
    ]

    const products = overrides?.products || defaultProducts
    for (const product of products) {
      await createProduct({
        ...defaultProducts[0],
        ...product,
        ...(tenantId ? { tenantId } : {}),
      })
    }

    // ── Deals ───────────────────────────────────────────────────────────
    const stageIds = [
      { id: 'stage-1', name: 'Lead' },
      { id: 'stage-2', name: 'Qualificação' },
      { id: 'stage-3', name: 'Proposta' },
      { id: 'stage-4', name: 'Negociação' },
      { id: 'stage-5', name: 'Fechamento' },
    ]

    const dealsData = [
      { title: 'Sistema ERP - TechVision', value: 95000, companyId: companyIds[0], contactId: contactIds[0], funnelId, stageId: 'stage-4', owner: 'Carlos Silva', products: [], customFields: {} },
      { title: 'Consultoria - GreenBuild', value: 35000, companyId: companyIds[1], contactId: contactIds[1], funnelId, stageId: 'stage-3', owner: 'Ana Costa', products: [], customFields: {} },
      { title: 'Licenças - MegaFood', value: 50000, companyId: companyIds[2], contactId: contactIds[2], funnelId, stageId: 'stage-2', owner: 'Carlos Silva', products: [], customFields: {} },
      { title: 'Plataforma EduPlus', value: 120000, companyId: companyIds[3], contactId: contactIds[3], funnelId, stageId: 'stage-1', owner: 'Maria Santos', products: [], customFields: {} },
      { title: 'LogiTrans WMS', value: 75000, companyId: companyIds[4], contactId: contactIds[4], funnelId, stageId: 'stage-5', owner: 'Ana Costa', products: [], customFields: {} },
      { title: 'Suporte Premium - TechVision', value: 8000, companyId: companyIds[0], contactId: contactIds[0], funnelId, stageId: 'stage-2', owner: 'Carlos Silva', products: [], customFields: {} },
      { title: 'Treinamento MegaFood', value: 15000, companyId: companyIds[2], contactId: contactIds[2], funnelId, stageId: 'stage-1', owner: 'Maria Santos', products: [], customFields: {} },
      { title: 'Implementação GreenBuild', value: 45000, companyId: companyIds[1], contactId: contactIds[1], funnelId, stageId: 'stage-4', owner: 'Ana Costa', products: [], customFields: {} },
    ]

    for (const deal of dealsData) {
      await createDeal({
        ...deal,
        ...(tenantId ? { tenantId } : {}),
      })
    }

    // ── Activities ──────────────────────────────────────────────────────
    const activityTemplates = [
      { type: 'note' as const, authorId: 'Carlos Silva', content: 'Primeiro contato realizado. Cliente demonstrou interesse na solução enterprise.' },
      { type: 'email' as const, authorId: 'Ana Costa', content: 'Proposta comercial enviada por e-mail com condições especiais.' },
      { type: 'call' as const, authorId: 'Carlos Silva', content: 'Ligação para alinhar requisitos técnicos do projeto.' },
      { type: 'whatsapp' as const, authorId: 'Maria Santos', content: 'Cliente solicitou mais informações via WhatsApp sobre módulos disponíveis.' },
      { type: 'meeting' as const, authorId: 'Ana Costa', content: 'Reunião presencial agendada para apresentação da plataforma.' },
    ]

    // Attach activities to the newly created deals (we need their IDs)
    const createdDeals = await getDeals(tenantId)
    for (let i = 0; i < Math.min(createdDeals.length, 5); i++) {
      for (const act of activityTemplates.slice(0, 2 + (i % 3))) {
        await createActivity({
          ...act,
          dealId: createdDeals[i].id,
          ...(tenantId ? { tenantId } : {}),
        })
      }
    }

    // ── Tasks ───────────────────────────────────────────────────────────
    const taskTemplates = [
      { title: 'Enviar proposta atualizada', dueDate: '2026-04-20', completed: false, assigneeId: 'Carlos Silva' },
      { title: 'Agendar reunião de follow-up', dueDate: '2026-04-18', completed: false, assigneeId: 'Ana Costa' },
      { title: 'Preparar demonstração do produto', dueDate: '2026-04-22', completed: true, assigneeId: 'Maria Santos' },
    ]

    for (let i = 0; i < Math.min(createdDeals.length, 3); i++) {
      for (const task of taskTemplates.slice(0, 1 + (i % 3))) {
        await createTask({
          ...task,
          dealId: createdDeals[i].id,
          ...(tenantId ? { tenantId } : {}),
        })
      }
    }

    // ── Second funnel ───────────────────────────────────────────────────
    await createFunnel({
      name: 'Funil de Renovação',
      stages: [
        { id: 'ren-1', name: 'Em Análise', color: '#8b5cf6', order: 1 },
        { id: 'ren-2', name: 'Proposta Enviada', color: '#06b6d4', order: 2 },
        { id: 'ren-3', name: 'Renovado', color: '#22c55e', order: 3 },
      ],
      ...(tenantId ? { tenantId } : {}),
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error seeding demo data:', error)
    return { success: false, error: error.message }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// LOAD ALL DATA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Load all data, optionally filtered by tenantId.
 * If tenantId is null, undefined, or 'master', loads everything.
 */
export async function loadAllData(tenantId?: string | null) {
  // Determine the filter: only apply if it's a non-master, non-null value
  const filter = tenantId && tenantId !== 'master' ? tenantId : undefined

  const [funnels, deals, companies, contacts, products, proposals, activities, tasks, customFields, automations, users] =
    await Promise.all([
      getFunnels(filter),
      getDeals(filter),
      getCompanies(filter),
      getContacts(filter),
      getProducts(filter),
      getProposals(filter),
      getActivities(filter),
      getTasks(filter),
      getCustomFields(filter),
      getAutomations(filter),
      getUsers(filter),
    ])

  return { funnels, deals, companies, contacts, products, proposals, activities, tasks, customFields, automations, users }
}
