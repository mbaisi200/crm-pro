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
} from 'firebase/firestore'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import type { User, Funnel, Deal, Company, Contact, Product, Proposal, Activity, Task, CustomField, Automation } from '@/stores/crm-store'

// Simple hash for admin passwords (not crypto-grade, but better than plaintext)
export async function simpleHash(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'crm-salt-2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ===== AUTH =====
export async function loginMaster(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return { success: true, uid: userCredential.user.uid, email: userCredential.user.email }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

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
    return { success: true, uid: userDoc.id, email: userData.email, name: userData.name, role: userData.role }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function registerMaster(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const hashedPassword = await simpleHash(password)
    await addDoc(collection(db, 'users'), {
      email,
      name: 'Master Admin',
      role: 'master',
      password: hashedPassword,
      createdAt: serverTimestamp(),
    })
    return { success: true, uid: userCredential.user.uid }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ===== GENERIC CRUD =====
async function getAll<T>(collectionName: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db, collectionName))
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T))
}

async function getById<T>(collectionName: string, id: string): Promise<T | null> {
  const docRef = doc(db, collectionName, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as T
}

async function create<T>(collectionName: string, data: any): Promise<string> {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

async function update(collectionName: string, id: string, data: any): Promise<void> {
  const docRef = doc(db, collectionName, id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

async function remove(collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, collectionName, id)
  await deleteDoc(docRef)
}

// ===== USERS =====
export const getUsers = () => getAll<User>('users')
export const createUser = (data: any) => create('users', data)
export const updateUser = (id: string, data: any) => update('users', id, data)
export const deleteUser = (id: string) => remove('users', id)

// ===== FUNNELS =====
export const getFunnels = () => getAll<Funnel>('funnels')
export const createFunnel = (data: any) => create('funnels', data)
export const updateFunnel = (id: string, data: any) => update('funnels', id, data)
export const deleteFunnel = (id: string) => remove('funnels', id)

// ===== DEALS =====
export const getDeals = () => getAll<Deal>('deals')
export const getDealsByFunnel = async (funnelId: string): Promise<Deal[]> => {
  const q = query(collection(db, 'deals'), where('funnelId', '==', funnelId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Deal))
}
export const createDeal = (data: any) => create('deals', data)
export const updateDeal = (id: string, data: any) => update('deals', id, data)
export const deleteDeal = (id: string) => remove('deals', id)

// ===== COMPANIES =====
export const getCompanies = () => getAll<Company>('companies')
export const createCompany = (data: any) => create('companies', data)
export const updateCompany = (id: string, data: any) => update('companies', id, data)
export const deleteCompany = (id: string) => remove('companies', id)

// ===== CONTACTS =====
export const getContacts = () => getAll<Contact>('contacts')
export const createContact = (data: any) => create('contacts', data)
export const updateContact = (id: string, data: any) => update('contacts', id, data)
export const deleteContact = (id: string) => remove('contacts', id)

// ===== PRODUCTS =====
export const getProducts = () => getAll<Product>('products')
export const createProduct = (data: any) => create('products', data)
export const updateProduct = (id: string, data: any) => update('products', id, data)
export const deleteProduct = (id: string) => remove('products', id)

// ===== PROPOSALS =====
export const getProposals = () => getAll<Proposal>('proposals')
export const createProposal = (data: any) => create('proposals', data)
export const updateProposal = (id: string, data: any) => update('proposals', id, data)
export const deleteProposal = (id: string) => remove('proposals', id)

// ===== ACTIVITIES =====
export const getActivities = () => getAll<Activity>('activities')
export const getActivitiesByDeal = async (dealId: string): Promise<Activity[]> => {
  const q = query(collection(db, 'activities'), where('dealId', '==', dealId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity))
}
export const createActivity = (data: any) => create('activities', data)

// ===== TASKS =====
export const getTasks = () => getAll<Task>('tasks')
export const getTasksByDeal = async (dealId: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('dealId', '==', dealId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task))
}
export const createTask = (data: any) => create('tasks', data)
export const updateTask = (id: string, data: any) => update('tasks', id, data)
export const deleteTask = (id: string) => remove('tasks', id)

// ===== CUSTOM FIELDS =====
export const getCustomFields = () => getAll<CustomField>('customFields')
export const createCustomField = (data: any) => create('customFields', data)
export const updateCustomField = (id: string, data: any) => update('customFields', id, data)
export const deleteCustomField = (id: string) => remove('customFields', id)

// ===== AUTOMATIONS =====
export const getAutomations = () => getAll<Automation>('automations')
export const createAutomation = (data: any) => create('automations', data)
export const updateAutomation = (id: string, data: any) => update('automations', id, data)
export const deleteAutomation = (id: string) => remove('automations', id)

// ===== REAL-TIME LISTENERS =====
export function subscribeToDeals(callback: (deals: Deal[]) => void) {
  return onSnapshot(collection(db, 'deals'), (snapshot) => {
    const deals = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Deal))
    callback(deals)
  })
}

export function subscribeToActivities(dealId: string, callback: (activities: Activity[]) => void) {
  const q = query(collection(db, 'activities'), where('dealId', '==', dealId))
  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity))
    callback(activities)
  })
}

// ===== SEED DEMO DATA =====
export async function seedDemoData() {
  try {
    // Create demo funnel
    const funnelId = await createFunnel({
      name: 'Funil de Vendas',
      stages: [
        { id: 'stage-1', name: 'Lead', color: '#6366f1', order: 1 },
        { id: 'stage-2', name: 'Qualificação', color: '#f59e0b', order: 2 },
        { id: 'stage-3', name: 'Proposta', color: '#3b82f6', order: 3 },
        { id: 'stage-4', name: 'Negociação', color: '#f97316', order: 4 },
        { id: 'stage-5', name: 'Fechamento', color: '#22c55e', order: 5 },
      ],
    })

    // Create demo companies
    const companies = [
      { name: 'TechVision Ltda', cnpj: '12.345.678/0001-90', industry: 'Tecnologia', phone: '(11) 3456-7890', email: 'contato@techvision.com.br', address: 'Av. Paulista, 1000 - São Paulo/SP', website: 'www.techvision.com.br', owner: 'Carlos Silva', customFields: {} },
      { name: 'GreenBuild Construtora', cnpj: '23.456.789/0001-01', industry: 'Construção', phone: '(21) 2345-6789', email: 'comercial@greenbuild.com.br', address: 'Rua da Assembleia, 50 - Rio de Janeiro/RJ', website: 'www.greenbuild.com.br', owner: 'Ana Costa', customFields: {} },
      { name: 'MegaFood Alimentos', cnpj: '34.567.890/0001-12', industry: 'Alimentício', phone: '(31) 3456-7891', email: 'vendas@megafood.com.br', address: 'Av. Afonso Pena, 200 - Belo Horizonte/MG', website: 'www.megafood.com.br', owner: 'Carlos Silva', customFields: {} },
      { name: 'EduPlus Educação', cnpj: '45.678.901/0001-23', industry: 'Educação', phone: '(41) 3456-7892', email: 'contato@eduplus.com.br', address: 'Rua XV de Novembro, 300 - Curitiba/PR', website: 'www.eduplus.com.br', owner: 'Maria Santos', customFields: {} },
      { name: 'LogiTrans Logística', cnpj: '56.789.012/0001-34', industry: 'Logística', phone: '(51) 3456-7893', email: 'operacional@logitrans.com.br', address: 'Porto Seco, 100 - Porto Alegre/RS', website: 'www.logitrans.com.br', owner: 'Ana Costa', customFields: {} },
    ]

    const companyIds: string[] = []
    for (const company of companies) {
      const id = await createCompany(company)
      companyIds.push(id)
    }

    // Create demo contacts
    const contacts = [
      { name: 'Roberto Almeida', email: 'roberto@techvision.com.br', phone: '(11) 98765-4321', position: 'Diretor Comercial', companyId: companyIds[0], owner: 'Carlos Silva', customFields: {} },
      { name: 'Fernanda Lima', email: 'fernanda@greenbuild.com.br', phone: '(21) 98765-4322', position: 'Gerente de Projetos', companyId: companyIds[1], owner: 'Ana Costa', customFields: {} },
      { name: 'Paulo Mendes', email: 'paulo@megafood.com.br', phone: '(31) 98765-4323', position: 'CEO', companyId: companyIds[2], owner: 'Carlos Silva', customFields: {} },
      { name: 'Lucia Ferreira', email: 'lucia@eduplus.com.br', phone: '(41) 98765-4324', position: 'Coordenadora', companyId: companyIds[3], owner: 'Maria Santos', customFields: {} },
      { name: 'Marcos Oliveira', email: 'marcos@logitrans.com.br', phone: '(51) 98765-4325', position: 'Diretor de Operações', companyId: companyIds[4], owner: 'Ana Costa', customFields: {} },
    ]

    const contactIds: string[] = []
    for (const contact of contacts) {
      const id = await createContact(contact)
      contactIds.push(id)
    }

    // Create demo products
    const products = [
      { name: 'Licença Enterprise', sku: 'LIC-ENT-001', price: 25000, description: 'Licença anual do sistema enterprise', category: 'Software' },
      { name: 'Consultoria Estratégica', sku: 'CONS-EST-001', price: 15000, description: 'Pacote de 40h de consultoria', category: 'Serviço' },
      { name: 'Implementação Customizada', sku: 'IMP-CUS-001', price: 45000, description: 'Implementação com customizações', category: 'Serviço' },
      { name: 'Suporte Premium', sku: 'SUP-PRE-001', price: 8000, description: 'Suporte 24/7 por 12 meses', category: 'Serviço' },
      { name: 'Treinamento Corporativo', sku: 'TRE-COR-001', price: 5000, description: 'Treinamento para equipe completa', category: 'Treinamento' },
    ]

    for (const product of products) {
      await createProduct(product)
    }

    // Create demo deals
    const stages = [
      { id: 'stage-1', name: 'Lead' },
      { id: 'stage-2', name: 'Qualificação' },
      { id: 'stage-3', name: 'Proposta' },
      { id: 'stage-4', name: 'Negociação' },
      { id: 'stage-5', name: 'Fechamento' },
    ]

    const deals = [
      { title: 'Sistema ERP - TechVision', value: 95000, companyId: companyIds[0], contactId: contactIds[0], funnelId, stageId: 'stage-4', owner: 'Carlos Silva', products: [], customFields: {} },
      { title: 'Consultoria - GreenBuild', value: 35000, companyId: companyIds[1], contactId: contactIds[1], funnelId, stageId: 'stage-3', owner: 'Ana Costa', products: [], customFields: {} },
      { title: 'Licenças - MegaFood', value: 50000, companyId: companyIds[2], contactId: contactIds[2], funnelId, stageId: 'stage-2', owner: 'Carlos Silva', products: [], customFields: {} },
      { title: 'Plataforma EduPlus', value: 120000, companyId: companyIds[3], contactId: contactIds[3], funnelId, stageId: 'stage-1', owner: 'Maria Santos', products: [], customFields: {} },
      { title: 'LogiTrans WMS', value: 75000, companyId: companyIds[4], contactId: contactIds[4], funnelId, stageId: 'stage-5', owner: 'Ana Costa', products: [], customFields: {} },
      { title: 'Suporte Premium - TechVision', value: 8000, companyId: companyIds[0], contactId: contactIds[0], funnelId, stageId: 'stage-2', owner: 'Carlos Silva', products: [], customFields: {} },
      { title: 'Treinamento MegaFood', value: 15000, companyId: companyIds[2], contactId: contactIds[2], funnelId, stageId: 'stage-1', owner: 'Maria Santos', products: [], customFields: {} },
      { title: 'Implementação GreenBuild', value: 45000, companyId: companyIds[1], contactId: contactIds[1], funnelId, stageId: 'stage-4', owner: 'Ana Costa', products: [], customFields: {} },
    ]

    for (const deal of deals) {
      await createDeal(deal)
    }

    // Create demo activities
    const activityData = [
      { type: 'note', dealId: '', authorId: 'Carlos Silva', content: 'Primeiro contato realizado. Cliente demonstrou interesse na solução enterprise.' },
      { type: 'email', dealId: '', authorId: 'Ana Costa', content: 'Proposta comercial enviada por e-mail com condições especiais.' },
      { type: 'call', dealId: '', authorId: 'Carlos Silva', content: 'Ligação para alinhar requisitos técnicos do projeto.' },
      { type: 'whatsapp', dealId: '', authorId: 'Maria Santos', content: 'Cliente solicitou mais informações via WhatsApp sobre módulos disponíveis.' },
      { type: 'meeting', dealId: '', authorId: 'Ana Costa', content: 'Reunião presencial agendada para apresentação da plataforma.' },
    ]

    // We'll add activities for the first few deals
    const dealIds = await getDeals()
    for (let i = 0; i < Math.min(dealIds.length, 5); i++) {
      for (const act of activityData.slice(0, 2 + (i % 3))) {
        await createActivity({ ...act, dealId: dealIds[i].id })
      }
    }

    // Create demo tasks
    const taskData = [
      { title: 'Enviar proposta atualizada', dueDate: '2026-04-20', completed: false, assigneeId: 'Carlos Silva' },
      { title: 'Agendar reunião de follow-up', dueDate: '2026-04-18', completed: false, assigneeId: 'Ana Costa' },
      { title: 'Preparar demonstração do produto', dueDate: '2026-04-22', completed: true, assigneeId: 'Maria Santos' },
    ]

    for (let i = 0; i < Math.min(dealIds.length, 3); i++) {
      for (const task of taskData.slice(0, 1 + (i % 3))) {
        await createTask({ ...task, dealId: dealIds[i].id })
      }
    }

    // Create a second funnel
    await createFunnel({
      name: 'Funil de Renovação',
      stages: [
        { id: 'ren-1', name: 'Em Análise', color: '#8b5cf6', order: 1 },
        { id: 'ren-2', name: 'Proposta Enviada', color: '#06b6d4', order: 2 },
        { id: 'ren-3', name: 'Renovado', color: '#22c55e', order: 3 },
      ],
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error seeding demo data:', error)
    return { success: false, error: error.message }
  }
}

// ===== LOAD ALL DATA =====
export async function loadAllData() {
  const [funnels, deals, companies, contacts, products, proposals, activities, tasks, customFields, automations, users] = await Promise.all([
    getFunnels(),
    getDeals(),
    getCompanies(),
    getContacts(),
    getProducts(),
    getProposals(),
    getActivities(),
    getTasks(),
    getCustomFields(),
    getAutomations(),
    getUsers(),
  ])

  return { funnels, deals, companies, contacts, products, proposals, activities, tasks, customFields, automations, users }
}
