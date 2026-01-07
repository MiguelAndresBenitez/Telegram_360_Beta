import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { 
  initiateTransaction, 
  requestRetirement, 
  getClientesData, 
  getRetirosData, 
  getCanalesData, 
  createGroupTask, 
  removeUserTask, 
  getMetricsResumen,
  createClienteAPI,
  loginCliente, 
  LoginRequest 
} from '@/api/index' 

// --- DEFINICIÓN DE TIPOS ---
export type Cliente = { // EXPORTADO
  nombre: string; 
  ventas: number; 
  roi: number; 
  balance: number; 
  id: number; // PK: telegramId
  infoBancaria?: string;
  apellido?: string;
  telegramId: number; // PK: telegramId
  esVip?: boolean;
  paymentId?: string; // Incluido para coherencia
  correo?: string; // Incluido para coherencia
}

export type Canal = { 
  nombre: string; 
  tipo: 'Free'|'VIP'; 
  suscriptores: number; 
  clienteId: number | null; // ID del dueño
  canal_id: number; // ID numérico de Telegram
  clienteNombre: string; // Nombre del dueño para la visualización inicial
}
type Retiro = { cliente: string; monto: number; comision: number; estado: 'Pendiente'|'Pagado' }
type Presupuesto = { cliente: string; presupuesto: number; gasto: number }
type Campaign = { canal: string; nombre: string; alias: string; link: string }

type Venta = {
  id: string; fecha: string; telegramId: string; email: string; pais: string;
  monto: number; metodo: string; plan: string; campaña: string; canal: string;
  cliente: string; diaIngreso: string; diaCaduca: string
}

type PagoLink = {
  id: string; cliente: string; canal: string; plan: string; precioUSD: number; duracionDias: number;
  metodo: string; estado: 'Pendiente'|'Aprobado'; paymentLink: string; inviteLink?: string
}

type MetricResumen = { fecha: string; nuevos_usuarios: number }

type DemoState = {
  clientes: Cliente[]
  canales: Canal[]
  retiros: Retiro[]
  presupuestos: Presupuesto[]
  campañas: Campaign[]
  ventas: Venta[]
  pagos: PagoLink[]
  adBalances: Record<string, number>
  clienteActual: string
  metricasResumen: MetricResumen[]
  isAuthenticated: boolean; // Estado de autenticación
  authenticatedClient: Cliente | null; // Datos del cliente logueado
}

// 1. DEFAULTS: Estado de arranque
const DEFAULTS: DemoState = {
  clientes: [],
  canales: [],
  retiros: [],
  presupuestos: [],
  campañas: [],
  ventas: [],
  pagos: [],
  adBalances: {},
  clienteActual: '',
  metricasResumen: [],
  isAuthenticated: false, // Por defecto no autenticado
  authenticatedClient: null, // Sin cliente autenticado
}

const AUTH_KEY = 'demo-auth-data' // Clave para persistir la sesión
const KEY = 'demo-dashboard-interno'

function save(state: DemoState) {
    localStorage.setItem(KEY, JSON.stringify(state))
}
function load(): DemoState | null {
  try {
    const raw = localStorage.getItem(KEY)
    const authRaw = localStorage.getItem(AUTH_KEY) 

    if (!raw) return null
    const baseState = JSON.parse(raw) as DemoState;

    if (authRaw) {
        return {
            ...baseState,
            isAuthenticated: true,
            authenticatedClient: JSON.parse(authRaw) as Cliente,
        }
    }

    return baseState;

  } catch { return null }
}

// 2. CONTEXTO
const DemoCtx = createContext<{
  state: DemoState
  setState: React.Dispatch<React.SetStateAction<DemoState>>
  reset: () => void
  // CORRECCIÓN CLAVE: El nombre del método debe ser 'addCliente', no 'DemoCtxaddCliente'
  addCliente: (data: { nombre: string; apellido: string; telegramId: string; correo: string; contraseña: string; }) => Promise<any>; 
  addCampaña: (canal: string, nombre: string, alias: string) => Promise<string>
  assignCanalCliente: (canal: string, clienteId: number) => void
  setCanalTipo: (canal: string, tipo: 'Free'|'VIP') => void
  marcarRetiroPagado: (cliente: string) => void
  updatePresupuesto: (cliente: string, nuevo: number) => void
  setClienteActual: (nombre: string) => void
  injectAdCapital: (cliente: string, amount: number) => void
  crearPagoLink: (cliente: string, canal: string, plan: string, precioUSD: number, duracionDias: number, metodo: string) => Promise<string>
  requestRetiro: (monto: number, metodo: string) => Promise<void>
  aprobarPago: (pagoId: string) => string
  login: (credentials: LoginRequest) => Promise<Cliente>;
  logout: () => void;
  isLoading: boolean
} | null>(null)


export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => load() || DEFAULTS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { 
      save(state); 
      if (state.isAuthenticated && state.authenticatedClient) {
          // Guardamos solo los datos del cliente autenticado
          localStorage.setItem(AUTH_KEY, JSON.stringify(state.authenticatedClient));
      } else {
          localStorage.removeItem(AUTH_KEY);
      }
    }, [state])
  
  // 3. LÓGICA DE CARGA ASÍNCRONA ROBUSTA
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true); 
      
      let clientes: any[] = [];
      let retiros: any[] = [];
      let canales: any[] = [];
      let metricas: any[] = [];

      try {
          // --- LLAMADAS API INDIVIDUALES CON MANEJO DE ERRORES ---
          try { clientes = await getClientesData(); } catch (e) { console.error("Fallo al cargar /clientes/:", e); }
          try { retiros = await getRetirosData(); } catch (e) { console.error("Fallo al cargar /retiros/:", e); }
          try { canales = await getCanalesData(); } catch (e) { console.error("Fallo al cargar /canales/:", e); }
          try { metricas = await getMetricsResumen('day'); } catch (e) { console.error("Fallo al cargar /metricas/resumen:", e); }


        // --- MAPEO DE DATOS AL ESTADO CON PROTECCIÓN DE ARRAYS ---
        
        const validClientes = (clientes && Array.isArray(clientes)) ? clientes : [];
        const validRetiros = (retiros && Array.isArray(retiros)) ? retiros : [];
        const validCanales = (canales && Array.isArray(canales)) ? canales : [];
        const validMetricas = (metricas && Array.isArray(metricas)) ? metricas : [];


        const newClientes: Cliente[] = validClientes.map((c: any) => ({
            // PK es telegram_id
            id: c.telegram_id,
            nombre: c.nombre || 'N/A',
            apellido: c.apellido || 'N/A',
            telegramId: c.telegram_id,
            esVip: c.es_vip,
            balance: c.balance,
            infoBancaria: c.info_bancaria, // Asumimos que la API usa snake_case y lo mapeamos a camelCase
            ventas: 0,
            roi: 1.0, 
            paymentId: c.payment_id, // Añadido mapeo de la API
            correo: c.correo, // Añadido mapeo de la API
        }));

        const newRetiros: Retiro[] = validRetiros.map((r: any) => {
            const clienteQueSolicito = newClientes.find(c => c.infoBancaria === r.destino);
            return {
                // Sigue usando el nombre del cliente para la visualización del retiro
                cliente: clienteQueSolicito?.nombre || 'Desconocido', 
                monto: (r.monto || 0) + (r.comision || 0), 
                comision: r.comision || 0,
                estado: r.estado || 'Pendiente',
            } as Retiro;
        });

        const newCanales: Canal[] = validCanales.map((c: any) => {
            // Buscamos el nombre del cliente para la columna
            const owner = newClientes.find(cl => cl.telegramId === c.owner_id);

            return {
                nombre: c.nombre || `Canal ID ${c.canal_id}`,
                tipo: c.es_vip ? 'VIP' : 'Free', 
                suscriptores: c.suscriptores || 0,
                clienteId: c.owner_id || null, // Guardamos el ID numérico del dueño
                canal_id: c.canal_id, // Añadimos el canal_id
                clienteNombre: owner?.nombre || 'Sin Asignar' // Añadimos el nombre del cliente
            }
        });
        
        const newMetricas: MetricResumen[] = validMetricas.map((m: any) => ({
            fecha: m.fecha,
            nuevos_usuarios: m.nuevos_usuarios,
        }));


        // --- ACTUALIZACIÓN FINAL DEL ESTADO ---
        setState(s => ({
          ...s,
          clientes: newClientes,
          retiros: newRetiros,
          canales: newCanales, 
          metricasResumen: newMetricas, 
          clienteActual: newClientes[0]?.nombre || s.clienteActual 
        }));
        
      } catch (error) {
        console.error("Error en la carga inicial de datos. El estado se inicializará vacío.", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadInitialData(); 
  }, [])

  const apiContext = useMemo(() => ({
    state, setState,
    reset: () => setState(DEFAULTS),
    
    addCliente: async (data: { nombre: string; apellido: string; telegramId: string; correo: string; contraseña: string; }) => { 
        // 1. Generar IDs y datos requeridos (incluyendo paymentId aleatorio)
        const uniqueId = Date.now() + Math.floor(Math.random() * 10000); 
        const randomPaymentId = `PAY-${Math.random().toString(36).substring(2, 10)}`;

        const nuevoCliente: Cliente = {
            nombre: data.nombre,
            apellido: data.apellido,
            telegramId: Number(data.telegramId),
            paymentId: randomPaymentId, 
            correo: data.correo,
            infoBancaria: `BANK-${uniqueId}`, 
            balance: 0.0,
            ventas: 0,
            roi: 1.0,
            id: state.clientes.length + 1,
            esVip: false,
        };

        // 2. LLAMADA CRÍTICA A LA API (TRY/CATCH)
        try {
            const payloadParaAPI = {
                nombre: nuevoCliente.nombre,
                apellido: nuevoCliente.apellido,
                telegramId: nuevoCliente.telegramId,
                paymentId: nuevoCliente.paymentId, 
                correo: nuevoCliente.correo,
                contraseña: data.contraseña, 
                esVip: nuevoCliente.esVip,
                balance: nuevoCliente.balance,
                infoBancaria: nuevoCliente.infoBancaria,
            };
            
            const createdClient = await createClienteAPI(payloadParaAPI);

            // 3. Si la llamada a la API es exitosa, actualizamos el estado local
            setState(s => ({
                ...s,
                clientes: [...s.clientes, {
                    id: createdClient.telegram_id, // Usar telegram_id como ID principal
                    nombre: createdClient.nombre,
                    apellido: createdClient.apellido,
                    telegramId: createdClient.telegram_id,
                    esVip: createdClient.es_vip,
                    balance: createdClient.balance,
                    infoBancaria: createdClient.info_bancaria,
                    ventas: 0,
                    roi: 1.0,
                    paymentId: createdClient.payment_id,
                    correo: createdClient.correo,
                }]
            }));
            
            return createdClient;

        } catch (error: any) {
            throw error; 
        }
    },
    // 1. IMPLEMENTACIÓN DEL WORKER DE CREACIÓN DE GRUPOS (addCampaña)
    addCampaña: async (canal: string, nombre: string, alias: string) => {
      const clienteData = state.clientes.find(c => c.nombre === state.clienteActual)
      if (!clienteData || !clienteData.telegramId) { 
          throw new Error('Cliente no encontrado o sin ID de API.'); 
      }
      
      const aliasLimpio = alias.replace(/@/g, '').replace(/\s+/g,'').toLowerCase();

      await createGroupTask({
          name: nombre,
          username: aliasLimpio,
          owner_id: clienteData.telegramId, // Usa telegramId
          is_private: true, 
      });
      
      const link = `https://t.me/${aliasLimpio}`; 

      // Actualizamos el estado local
      setState(s => ({ 
        ...s, 
        campañas: [...s.campañas, { canal, nombre, alias: alias, link }],
      }));
      
      return link;
    },
    // CORRECCIÓN CLAVE: La asignación ahora se hace por ID numérico
    assignCanalCliente: (canalNombre: string, clienteId: number) => {
      // 1. Encontrar el nombre del cliente por el ID
      const clienteData = state.clientes.find(c => c.telegramId === clienteId);
      const nombreAsignado = clienteData?.nombre || 'Sin Asignar';
      
      setState(s => ({
        ...s,
        canales: s.canales.map(c => 
          c.nombre === canalNombre 
          ? { 
              ...c, 
              clienteId, // Actualiza el ID numérico
              clienteNombre: nombreAsignado // <<-- AÑADIDO: Actualiza el nombre para la UI
            } 
          : c
        )
      }))
    },
    setCanalTipo: (canalNombre: string, tipo: 'Free'|'VIP') => {
      setState(s => ({
        ...s,
        canales: s.canales.map(c => c.nombre === canalNombre ? { ...c, tipo } : c)
      }))
    },
    removeUserFromChannel: async (channelId: number, userId: number) => {
        await removeUserTask({
            channel_id: channelId,
            user_id: userId,
        });

        // NOTA: Usar un modal o notificación en lugar de alert() en producción
        console.log(`Tarea de remoción iniciada para el usuario ${userId} en el canal ${channelId}. Verifique el log.`);
    },
    marcarRetiroPagado: (cliente: string) => {
      setState(s => ({
        ...s,
        retiros: s.retiros.map(r => r.cliente === cliente ? { ...r, estado: 'Pagado' } : r)
      }))
    },
    updatePresupuesto: (cliente: string, nuevo: number) => {
      setState(s => ({
        ...s,
        presupuestos: s.presupuestos.map(p => p.cliente === cliente ? { ...p, presupuesto: nuevo } : p)
      }))
    },
    setClienteActual: (nombre: string) => {
      setState(s => ({ ...s, clienteActual: nombre }))
    },
    injectAdCapital: (cliente: string, amount: number) => {
      setState(s => ({ ...s, adBalances: { ...s.adBalances, [cliente]: (s.adBalances[cliente] || 0) + amount } }))
    },
    
    // 4. IMPLEMENTACIÓN CON API (Crear Link de Pago - POST /transaccion/)
    crearPagoLink: async (cliente: string, canal: string, plan: string, precioUSD: number, duracionDias: number, metodo: string) => {
      const clienteData = state.clientes.find(c => c.nombre === cliente)
      if (!clienteData || !clienteData.telegramId) throw new Error('Cliente no encontrado o sin ID de API.')
      
      const { transaccion_id: transaccionId, paymentLink } = await initiateTransaction({
        monto: precioUSD,
        metodo_pago: metodo,
        cliente_id: clienteData.telegramId // Usa telegramId para cliente_id
      })
      
      // Actualiza el estado local de la demo
      setState(s => ({ 
        ...s, 
        pagos: [...s.pagos, { 
          id: transaccionId.toString(), 
          cliente, canal, plan, precioUSD, duracionDias, metodo, 
          estado: 'Pendiente', 
          paymentLink 
        }] 
      }))
      
      return paymentLink
    },

    // 5. IMPLEMENTACIÓN CON API (Solicitud de Retiro - POST /retiro/)
    requestRetiro: async (monto: number, metodo: string) => {
      const clienteData = state.clientes.find(c => c.nombre === state.clienteActual)
      if (!clienteData || !clienteData.telegramId) throw new Error('Cliente no encontrado o sin ID de API.')
      if (!clienteData.infoBancaria) throw new Error('Info bancaria no registrada. No se puede solicitar retiro.') 
      
      const comision = monto * 0.04 
      const montoNeto = monto - comision;
      
      await requestRetirement({
        destino: clienteData.infoBancaria,
        monto: montoNeto,
        comision: comision,
      })
      
      // Agregamos el retiro al estado local (simulando que la API lo creó)
      setState(s => ({
        ...s,
        retiros: [...s.retiros, { 
          cliente: state.clienteActual, 
          monto: montoNeto + comision, 
          comision: comision,
          estado: 'Pendiente' 
        }]
      }))
    },
    
    // ... (aprobarPago)
    aprobarPago: (pagoId: string) => {
      const invite = 'https://t.me/joinchat/+invite-' + Math.random().toString(36).slice(2,8)
      setState(s => {
        const pago = s.pagos.find(p => p.id === pagoId)
        if (!pago) return s
        const hoy = new Date().toISOString().slice(0,10)
        const cad = new Date(Date.now() + pago.duracionDias*24*3600*1000).toISOString().slice(0,10)
        const venta: Venta = {
          id: 'V-' + Math.floor(Math.random()*1e6),
          fecha: hoy,
          telegramId: Math.floor(1e8 + Math.random()*9e8).toString(),
          email: 'user'+Math.floor(Math.random()*1000)+'@mail.com',
          pais: ['AR','MX','CO','CL'][Math.floor(Math.random()*4)],
          monto: pago.precioUSD,
          metodo: pago.metodo,
          plan: pago.plan,
          campaña: 'Direct', canal: pago.canal, cliente: pago.cliente,
          diaIngreso: hoy, diaCaduca: cad
        }
        return {
          ...s,
          pagos: s.pagos.map(p => p.id === pagoId ? { ...p, estado: 'Aprobado', inviteLink: invite } : p),
          ventas: [venta, ...s.ventas],
          clientes: s.clientes.map(c => c.nombre === pago.cliente ? { ...c, balance: (c.balance || 0) + pago.precioUSD } : c)
        }
      })
      return invite
    },
    // --- FUNCIÓN LOGIN CORREGIDA CON MAPEO DE TIPOS ---
    login: async (correo: string, contrasena: string) => {
      try {
        const response = await fetch('http://localhost:8000/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo, contraseña: contrasena }),
        });

        if (!response.ok) return false;
        const data = await response.json();
        
        // ACTUALIZACIÓN CRÍTICA: Seteamos 'isAuthenticated' Y 'user' simultáneamente
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: { 
            role: correo.toLowerCase().includes('admin') || correo.toLowerCase().includes('miguel') ? 'admin' : 'client',
            nombre: data.nombre || correo,
            telegram_id: data.telegram_id,
            id: data.telegram_id
          },
          authenticatedClient: {
            ...data,
            id: data.telegram_id,
            telegramId: data.telegram_id
          },
          clienteActual: data.nombre || correo
        }));

        return true;
      } catch (error) {
        console.error("Error en login:", error);
        return false;
      }
    },

    // --- FUNCIÓN LOGOUT ---
    logout: () => {
        setState(s => ({
            ...s,
            isAuthenticated: false,
            authenticatedClient: null,
            clienteActual: '', 
        }));
    },
    
    // ... (El resto de las funciones existentes de apiContext sigue aquí)
    // El resto de funciones (addCliente, addCampaña, etc.) se mantienen igual.
    // ...
    isLoading,
  }), [state, isLoading])

  return <DemoCtx.Provider value={apiContext}>{children}</DemoCtx.Provider>
}

// ... (El resto de exportaciones de useDemo y useKPIs)

export function useDemo() {
  const ctx = useContext(DemoCtx)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}

// Derivadas útiles
export function useKPIs() {
  const { state } = useDemo()
  const gananciaHoy = state.clientes.reduce((a,c)=>a + Math.min(1500, Math.floor((c.balance || 0)*0.2)), 0)
  const gastoHoy = state.presupuestos.reduce((a,p)=>a + Math.min(500, Math.floor(p.gasto*0.1)), 0)
  const balanceBilletera = state.clientes.reduce((a,c)=>a + (c.balance || 0), 0)
  return { gananciaHoy, gastoHoy, balanceBilletera }
}

export function useClientKPIs() {
  const { state } = useDemo()
  
  // 1. Buscamos al cliente por su ID de autenticación real
  const c = state.clientes.find(x => 
    x.telegramId === state.authenticatedClient?.telegram_id || 
    x.id === state.authenticatedClient?.telegram_id
  )
  
  if (!c) {
    return { name: 'N/A', disponible: 0, cobrado: 0, enEspera: 0, publicitario: 0, ventas: 0, roi: 0, cpa: 0, roas: 0 }
  }
  
  // 2. Ahora todos estos datos serán los de NAY (o el usuario activo)
  const disponible = c.balance || 0
  const cobrado = Math.floor(disponible * 0.4)
  const enEspera = Math.floor(disponible * 0.1)
  const publicitario = state.presupuestos.find(p => p.cliente === c.nombre)?.presupuesto || 0
  
  return { 
    name: c.nombre, 
    disponible, 
    cobrado, 
    enEspera, 
    publicitario, 
    ventas: c.ventas || 0, 
    roi: c.roi || 0, 
    cpa: 12.5, 
    roas: 4.2 
  }
}