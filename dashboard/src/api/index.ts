// copia/src/api/index.ts (Código final con funciones de Worker)

// Simula la URL de tu API de FastAPI
const API_BASE = 'http://localhost:8000'; 
const API_PAGOS_URL = "http://localhost:8001";

// --- Tipos de Datos ---

// 💡 Nuevo tipo para el Cliente (traído de models.py)
export interface Cliente {
  telegram_id: number;
  nombre: string;
  apellido: string;
  correo: string | null;
  es_vip: boolean;
  // Este es el campo que contiene el presupuesto/saldo del cliente
  balance: number; 
  vip_vence?: string; // Fecha en formato string si no es nula
  info_bancaria: string | null;
  payment_id: string | null;
  contraseña: string | null;
}

type TransaccionPayload = {
  monto: number; estado: string; metodo_pago: string; actor: 'Cliente';
  actor_id: number; timestamp: string; origen: string;
}

type RetiroPayload = {
  destino: string; monto: number; comision: number; timestamp: string;
  estado: 
  'Pendiente'|'Aprobado'|'Rechazado';
}

// --- Nuevo tipo para la solicitud de Login ---
export interface LoginRequest {
  correo: string;
  contraseña: string;
}

// -----------------------------------------------------
// --- FUNCIONES GET: Lectura de Datos de la DB ---
// -----------------------------------------------------

// 💡 Actualización: La función ahora está tipada para devolver un array de Cliente
export async function getClientesData(): Promise<Cliente[]> {
  const response = await fetch(`${API_BASE}/clientes/`);
  if (!response.ok) {
    throw new Error('Error de API al obtener clientes: ' + response.status);
  }
  return response.json() as Promise<Cliente[]>;
}

export async function getRetirosData() {
  const response = await fetch(`${API_BASE}/retiros/`);
  if (!response.ok) {
    throw new Error('Error de API al obtener retiros: ' + response.status);
  }
  return response.json();
}

/**
 * [GET /metricas/resumen] Obtiene el total de nuevos usuarios (JOIN_CHANNEL) por día.
 */
export async function getMetricsResumen(
    groupBy: 'day' | 'week' | 'month' | 'year' = 'day',
    cliente_id: number | 'all' = 'all',
    canal_type: 'VIP' | 'Free' | 'all' = 'all',
    // 🚨 CAMBIO: NUEVO PARÁMETRO DE FECHA LÍMITE (ISO STRING)
    timeLimit?: string 
) {
  try {
    const params: Record<string, any> = { group_by: groupBy };

    if (cliente_id !== 'all' && cliente_id !== undefined && cliente_id !== null) {
        params.cliente_telegram_id = cliente_id; 
    }

    if (canal_type !== 'all') {
        params.canal_type = canal_type;
    }
    
    // 🚨 CAMBIO: Añadir el filtro de tiempo si existe
    if (timeLimit) {
        params.fecha_inicio = timeLimit; // Envía la fecha ISO
    }

    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/metricas/resumen?${queryString}`);
    
    if (!response.ok) {
      console.error('Error de API al obtener el resumen de métricas: ' + response.status);
      return []; 
    }
    return response.json();
  } catch (error) {
    console.error("Fallo de red al obtener métricas:", error);
    return []; 
  }
}

/**
 * [GET /canales/] Obtiene la lista de todos los canales (Canal[]).
 * @returns Array de canales.
 */
export async function getCanalesData() {
    const response = await fetch(`${API_BASE}/canales/`);
    if (!response.ok) {
        throw new Error('Error de API al obtener canales: ' + response.status);
    }
    return response.json();
}

/**
 * [GET /canal/miembros/{id}] Obtiene la lista de usuarios (miembros) de un canal específico.
 * @returns Array de objetos Usuario.
 */
export async function getCanalMiembros(canalId: number) {
  const response = await fetch(`${API_BASE}/canal/miembros/${canalId}`);
  if (!response.ok) {
    throw new Error('Error de API al obtener miembros del canal: ' + response.status);
  }
  return response.json();
}

/**
 * [GET /cliente/{id}/miembros-csv] Obtiene el reporte detallado de miembros por canal del cliente.
 */
export async function getClientChannelMembersDetail(clienteId: number): Promise<any[]> {
    const response = await fetch(`${API_BASE}/cliente/${clienteId}/miembros-csv`);
    if (!response.ok) {
        // Lógica mejorada para capturar el error de la API
        let error_data = {};
        try { error_data = await response.json(); } catch {}
        const error_detail = (error_data as any).detail || `Error al obtener miembros para cliente ${clienteId}.`;
        throw new Error(error_detail);
    }
    return response.json(); 
}

// -----------------------------------------------------
// --- FUNCIONES PUT: Actualización de Datos en la DB --
// -----------------------------------------------------

/**
 * 💡 NUEVA FUNCIÓN: [PUT /cliente/balance/] Actualiza el balance del cliente.
 * El balance se usa como presupuesto.
 */
export async function updateClienteBalance(telegram_id: number, nuevo_balance: number) {
    
    // Usamos el endpoint PUT /cliente/balance/
    const response = await fetch(`${API_BASE}/cliente/balance/?telegram_id=${telegram_id}&nuevo_balance=${nuevo_balance}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // No se necesita body si pasamos los parámetros por query string
    });

    if (!response.ok) {
        let error_message = `Error de API: ${response.status} ${response.statusText}`;
        try {
            // Intentamos leer el JSON del error (donde FastAPI pone el 'detail')
            const error_data = await response.json();
            error_message = error_data.detail || error_message; 
        } catch (e) {
            // Si no es JSON, usamos el error estándar
        }
        throw new Error(error_message); 
    }

    return response.json();
}

/**
 * [PUT /canal/] Actualiza el dueño (owner_id) de un canal.
 * @param canalId ID único del canal de Telegram.
 * @param ownerTelegramId ID del cliente que será el nuevo dueño.
 */
export async function updateCanalOwner(canalId: number, ownerTelegramId: number) {
    const payload = {
        owner_id: ownerTelegramId,
        // Incluimos es_vip para cumplir con el modelo Canal, asumiendo que es true por defecto.
        es_vip: true 
    }; 
    
    // Llamada a la API: PUT /canal/?canal_id={canalId}
    const response = await fetch(`${API_BASE}/canal/?canal_id=${canalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let error_message = `Error de API: ${response.status} ${response.statusText}`;
        try {
            // Intentamos leer el JSON del error (donde FastAPI pone el 'detail')
            const error_data = await response.json();
            error_message = error_data.detail || error_message; // Tomamos el campo 'detail'
        } catch (e) {
            // Si no es JSON, usamos el error estándar
        }
        // Lanzamos una excepción con el mensaje claro.
        throw new Error(error_message); 
    }

    return response.json();
}


// -----------------------------------------------------
// --- FUNCIONES POST: Mutación y Tareas de Workers ---
// -----------------------------------------------------

/**
 * [POST /login/] Autentica a un Cliente o Admin.
 * FIX: Se envía como FormData para cumplir con OAuth2PasswordRequestForm
 */

/**
 * [POST /login/] Autentica a un Cliente o Admin.
 * CORRECCIÓN: Se usa FormData para evitar el error 422 de FastAPI.
 */
export async function loginCliente(credentials: { correo: string; contraseña: string }): Promise<any> {
  // FastAPI con OAuth2PasswordRequestForm requiere este formato específico
  const params = new URLSearchParams();
  params.append('username', credentials.correo);
  params.append('password', credentials.contraseña);

  const response = await fetch('http://localhost:8000/login/', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded' 
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Credenciales incorrectas");
  }

  return response.json();
}

/**
 * [POST /tasks/group_create] Envía una tarea para crear un nuevo canal/grupo en Telegram.
 */
export async function createGroupTask(data: {
  name: string;
  username: string; // Alias del grupo (ej: grupovipdemo)
  owner_id: number; // cliente_id
  is_private: boolean;
}) {
  const payload = {
    action: "create_group",
    name: data.name,
    username: data.username,
    owner_id: data.owner_id,
    is_private: data.is_private,
  };

  // ASUMIMOS que el backend tiene una ruta que envía esto a group_creation_queue
  const response = await fetch(`${API_BASE}/tasks/group_create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Error al enviar tarea de creación de grupo: ' + response.status);
  }
  return response.json(); // Retorna el ID de Telegram del nuevo canal
}

/**
 * [POST /tasks/remove_user] Envía una tarea para expulsar a un usuario del canal (soft kick).
 */
export async function removeUserTask(data: {
  channel_id: number; // ID numérico del canal (ej: -100...)
  user_id: number; // ID de Telegram del usuario
}) {
  const payload = {
    action: "remove_user",
    channel_id: data.channel_id,
    user_id: data.user_id,
  };

  // ASUMIMOS que el backend tiene una ruta que envía esto a user_removal_queue
  const response = await fetch(`${API_BASE}/tasks/remove_user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Error al enviar tarea de remoción de usuario: ' + response.status);
  }
  return response.json();
}

/**
 * [POST /transaccion/] Registra la intención de pago en la DB (Transaccion).
 */
export async function initiateTransaction(data: {
  monto: number;
  metodo_pago: string;
  cliente_id: number; // ID del cliente en la demo
}) {
  const payload: TransaccionPayload = {
    monto: data.monto,
    estado: 'Pendiente', // El pago real está pendiente de pasarela
    metodo_pago: data.metodo_pago,
    actor: 'Cliente',
    actor_id: data.cliente_id, // Usamos el ID del cliente como actor_id
    timestamp: new Date().toISOString(),
    origen: 'web/subscription'
  };

  const response = await fetch(`${API_BASE}/transaccion/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Error de API al iniciar transacción. Código: ' + response.status);
  }

  const transaction = await response.json();
  
  return { transaccion_id: transaction.transaccion_id, paymentLink: `https://pay.gateway.com/checkout/${transaction.transaccion_id}` };
}

/**
 * [POST /retiro/] Registra una solicitud de retiro de fondos (Retiro).
 */
export async function requestRetirement(data: {
  destino: string; // info_bancaria
  monto: number;
  comision: number;
}) {
  const payload: RetiroPayload = {
    destino: data.destino,
    monto: data.monto,
    comision: data.comision,
    timestamp: new Date().toISOString(),
    estado: 'Pendiente'
  };

  const response = await fetch(`${API_BASE}/retiro/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Error de API al solicitar retiro. Código: ' + response.status);
  }
  return response.json();
}

/**
 * [POST /tasks/create_invite] Envía una tarea para crear y enviar una invitación de Telegram.
 */
export async function create_invite_task(data: {
    canal_id: number;
    cliente_telegram_id: number;
    user_telegram_id: number;
    is_paid: boolean;
}) {
    const response = await fetch(`${API_BASE}/tasks/create_invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        let error_message = `Error de API: ${response.status} ${response.statusText}`;
        try {
            const error_data = await response.json();
            error_message = error_data.detail || error_message;
        } catch (e) {
            // Fallback
        }
        throw new Error(error_message);
    }
    return response.json();
}

/**
 * [POST /cliente/] Inserta un nuevo cliente en la base de datos de FastAPI.
 */
export async function createClienteAPI(clientData: any) {
    
    // El payload debe coincidir con el modelo Cliente en models.py (snake_case)
    const payload = {
        nombre: clientData.nombre,
        apellido: clientData.apellido || 'N/A',
        // Mapeo de camelCase a snake_case
        telegram_id: clientData.telegramId,
        payment_id: clientData.paymentId, // Acepta el ID aleatorio
        correo: clientData.correo,
        // **IMPORTANTE**: Incluir contraseña si el modelo la tiene como NO opcional
        contraseña: clientData.contraseña || 'passwordTemporal', 
        es_vip: clientData.esVip || false,
        balance: clientData.balance || 0.0,
        info_bancaria: clientData.infoBancaria,
    };

    const response = await fetch(`${API_BASE}/cliente/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let error_message = `Error de API (${response.status}): ${response.statusText}`;
        try {
            const error_data = await response.json();
            error_message = error_data.detail || error_message;
        } catch {}
        throw new Error(error_message); 
    }
    return response.json(); 
}

export const paymentApi = {
  // Generar link de pago único (Preferencia)
  createPreference: async (monto: number, descripcion: string, ref: string) => {
    const response = await fetch(`${API_PAGOS_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: descripcion,
        quantity: 1,
        unit_price: monto,
        external_reference: ref
      }),
    });
    return response.json();
  },

  // Generar un Plan de Suscripción recurrente
  // CORRECCIÓN: Se ajustan los parámetros para que coincidan con el modelo del Backend
  createPlan: async (planData: { 
    reason: string, 
    transaction_amount: number, 
    payer_email: string, 
    external_reference: string,
    frequency?: number,
    frequency_type?: string,
    currency_id?: string
  }) => {
    const response = await fetch(`${API_PAGOS_URL}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: planData.reason,
        transaction_amount: planData.transaction_amount,
        payer_email: planData.payer_email,
        external_reference: planData.external_reference,
        frequency: planData.frequency || 1,
        frequency_type: planData.frequency_type || "months",
        currency_id: planData.currency_id || "ARS"
      }),
    });

    if (!response.ok) {
        const errorDetail = await response.json();
        throw errorDetail; // Esto permite ver el error 422 detallado en la consola
    }

    return response.json();
  }
};

// Obtener datos del cliente individual
export const getClienteData = async (telegram_id: number): Promise<Cliente> => {
    const response = await fetch(`${API_BASE}/cliente/?telegram_id=${telegram_id}`);
    if (!response.ok) throw new Error("No se pudo obtener el cliente");
    return response.json();
};

// Obtener transacciones vinculadas al cliente
export const getTransaccionesCliente = async (telegram_id: number): Promise<any[]> => {
    const response = await fetch(`${API_BASE}/transacciones/cliente?telegram_id=${telegram_id}`);
    if (!response.ok) throw new Error("No se pudieron obtener las transacciones");
    return response.json();
};