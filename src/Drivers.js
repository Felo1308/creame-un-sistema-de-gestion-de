/**
 * ====================================================================
 * GESTIÓN DE REPARTIDORES, GPS Y BALANCES (DRIVERS SERVICE)
 * ====================================================================
 */

/**
 * Obtiene todos los repartidores
 */
function obtenerRepartidores() {
  var reps = obtenerDatosHoja(SHEETS.REPARTIDORES);
  return reps.map(function(r) {
    return {
      id: r.id,
      nombre: r.nombre,
      telefono: r.telefono,
      vehiculo: r.vehiculo,
      placa: r.placa,
      estado: r.estado,
      latitud: parseFloat(r.latitud) || 0,
      longitud: parseFloat(r.longitud) || 0,
      ultima_actualizacion: r.ultima_actualizacion,
      balance_comisiones: parseFloat(r.balance_comisiones) || 0,
      efectivo_en_mano: parseFloat(r.efectivo_en_mano) || 0,
      calificacion: parseFloat(r.calificacion) || 5.0,
      foto_url: r.foto_url || ''
    };
  });
}

/**
 * Autentica un repartidor por PIN o ID
 */
function autenticarRepartidor(pinOId) {
  var reps = obtenerDatosHoja(SHEETS.REPARTIDORES);
  var found = reps.find(function(r) {
    return String(r.pin).trim() === String(pinOId).trim() || 
           String(r.id).toUpperCase().trim() === String(pinOId).toUpperCase().trim();
  });

  if (!found) {
    return { success: false, message: 'PIN o ID de repartidor inválido' };
  }

  return {
    success: true,
    repartidor: {
      id: found.id,
      nombre: found.nombre,
      telefono: found.telefono,
      vehiculo: found.vehiculo,
      placa: found.placa,
      estado: found.estado,
      balance_comisiones: parseFloat(found.balance_comisiones) || 0,
      efectivo_en_mano: parseFloat(found.efectivo_en_mano) || 0,
      calificacion: parseFloat(found.calificacion) || 5.0,
      foto_url: found.foto_url
    }
  };
}

/**
 * Actualiza la ubicación GPS en tiempo real enviada desde el móvil del repartidor
 */
function actualizarUbicacionRepartidor(repartidorId, lat, lng) {
  var ahora = new Date().toISOString();
  var updates = {
    latitud: parseFloat(lat),
    longitud: parseFloat(lng),
    ultima_actualizacion: ahora
  };

  var res = actualizarFila(SHEETS.REPARTIDORES, 'id', repartidorId, updates);
  return { success: res.success, timestamp: ahora };
}

/**
 * Cambia el estado del repartidor (ACTIVO / DESCONECTADO)
 */
function cambiarEstadoRepartidor(repartidorId, nuevoEstado) {
  var res = actualizarFila(SHEETS.REPARTIDORES, 'id', repartidorId, {
    estado: nuevoEstado,
    ultima_actualizacion: new Date().toISOString()
  });
  return { success: res.success, estado: nuevoEstado };
}

/**
 * Obtiene los pedidos asignados a un repartidor (activos e historial reciente)
 */
function obtenerPedidosRepartidor(repartidorId) {
  var todos = obtenerDatosHoja(SHEETS.PEDIDOS);
  var pedidosRep = todos.filter(function(p) {
    return p.repartidor_id === repartidorId;
  });

  // Dividir entre activos (ASIGNADO, EN_RUTA) e historial
  var activos = [];
  var historial = [];

  pedidosRep.forEach(function(p) {
    if (p.estado === 'ASIGNADO' || p.estado === 'EN_RUTA' || p.estado === 'EN_PREPARACION') {
      activos.push(p);
    } else {
      historial.push(p);
    }
  });

  // Ordenar activos por fecha
  activos.sort(function(a, b) {
    return new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0);
  });

  // Ordenar historial por fecha reciente
  historial.sort(function(a, b) {
    return new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0);
  });

  return {
    success: true,
    activos: activos,
    historial: historial.slice(0, 30)
  };
}

/**
 * Registra liquidación de cuentas con el repartidor:
 * - Liquidación de comisiones ganadas pagadas al repartidor
 * - Rendición de efectivo recaudado a la caja del negocio
 */
function liquidarBalanceRepartidor(repartidorId, montoComisionesPagadas, montoEfectivoRendido, notas) {
  var reps = obtenerDatosHoja(SHEETS.REPARTIDORES);
  var rep = reps.find(function(r) { return r.id === repartidorId; });

  if (!rep) return { success: false, message: 'Repartidor no encontrado' };

  var ahora = new Date().toISOString();
  var balanceActualComisiones = parseFloat(rep.balance_comisiones) || 0;
  var efectivoActual = parseFloat(rep.efectivo_en_mano) || 0;

  var comisionesPagar = parseFloat(montoComisionesPagadas) || 0;
  var efectivoRendir = parseFloat(montoEfectivoRendido) || 0;

  // Registrar transacciones de liquidación
  if (comisionesPagar > 0) {
    insertarFila(SHEETS.TRANSACCIONES, {
      id: 'TX-' + new Date().getTime().toString().slice(-6),
      fecha: ahora,
      repartidor_id: rep.id,
      repartidor_nombre: rep.nombre,
      tipo: 'PAGO_COMISION',
      monto: -comisionesPagar,
      pedido_id: '',
      descripcion: 'Pago de comisiones acumuladas. ' + (notas || ''),
      registrado_por: 'ADMIN'
    });
  }

  if (efectivoRendir > 0) {
    insertarFila(SHEETS.TRANSACCIONES, {
      id: 'TX-' + (new Date().getTime() + 2).toString().slice(-6),
      fecha: ahora,
      repartidor_id: rep.id,
      repartidor_nombre: rep.nombre,
      tipo: 'RENDICION_EFECTIVO',
      monto: -efectivoRendir,
      pedido_id: '',
      descripcion: 'Efectivo entregado a caja del negocio. ' + (notas || ''),
      registrado_por: 'ADMIN'
    });
  }

  var nuevoBalance = Math.max(0, balanceActualComisiones - comisionesPagar);
  var nuevoEfectivo = Math.max(0, efectivoActual - efectivoRendir);

  actualizarFila(SHEETS.REPARTIDORES, 'id', rep.id, {
    balance_comisiones: Math.round(nuevoBalance * 100) / 100,
    efectivo_en_mano: Math.round(nuevoEfectivo * 100) / 100
  });

  return {
    success: true,
    nuevoBalanceComisiones: nuevoBalance,
    nuevoEfectivoEnMano: nuevoEfectivo
  };
}

/**
 * Crea o actualiza un repartidor
 */
function guardarRepartidor(datos) {
  if (datos.id) {
    var res = actualizarFila(SHEETS.REPARTIDORES, 'id', datos.id, datos);
    return { success: res.success, id: datos.id };
  } else {
    var reps = obtenerDatosHoja(SHEETS.REPARTIDORES);
    var nuevoId = 'REP-0' + (reps.length + 1);
    datos.id = nuevoId;
    datos.estado = 'ACTIVO';
    datos.balance_comisiones = 0;
    datos.efectivo_en_mano = 0;
    datos.calificacion = 5.0;
    datos.ultima_actualizacion = new Date().toISOString();
    insertarFila(SHEETS.REPARTIDORES, datos);
    return { success: true, id: nuevoId };
  }
}
