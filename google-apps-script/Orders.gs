/**
 * ====================================================================
 * GESTIÓN DE PEDIDOS Y ASIGNACIÓN (ORDERS SERVICE)
 * ====================================================================
 */

/**
 * Obtiene la lista de pedidos con filtros opcionales
 */
function obtenerPedidos(filtros) {
  filtros = filtros || {};
  var pedidos = obtenerDatosHoja(SHEETS.PEDIDOS);

  // Ordenar los más recientes primero
  pedidos.sort(function(a, b) {
    return new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0);
  });

  if (filtros.estado && filtros.estado !== 'TODOS') {
    pedidos = pedidos.filter(function(p) { return p.estado === filtros.estado; });
  }

  if (filtros.repartidorId) {
    pedidos = pedidos.filter(function(p) { return p.repartidor_id === filtros.repartidorId; });
  }

  if (filtros.sucursalId) {
    pedidos = pedidos.filter(function(p) { return p.sucursal_id === filtros.sucursalId; });
  }

  return pedidos;
}

/**
 * Crea un nuevo pedido en el sistema
 */
function crearPedido(datos) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.PEDIDOS);
  
  // Generar ID correlativo
  var timestamp = new Date().getTime().toString().slice(-4);
  var count = sheet.getLastRow();
  var id = 'PED-' + (1000 + count);

  var fechaCreacion = new Date().toISOString();
  var montoProductos = parseFloat(datos.monto_productos || 0);
  var costoEnvio = parseFloat(datos.costo_envio || 0);
  var montoTotal = montoProductos + costoEnvio;

  var nuevoPedido = {
    id: id,
    fecha_creacion: fechaCreacion,
    cliente_nombre: datos.cliente_nombre || 'Cliente Anónimo',
    cliente_telefono: datos.cliente_telefono || '',
    cliente_direccion: datos.cliente_direccion || '',
    cliente_lat: datos.cliente_lat ? parseFloat(datos.cliente_lat) : '',
    cliente_lng: datos.cliente_lng ? parseFloat(datos.cliente_lng) : '',
    sucursal_id: datos.sucursal_id || '',
    sucursal_nombre: datos.sucursal_nombre || '',
    items_detalle: datos.items_detalle || '',
    monto_productos: montoProductos,
    costo_envio: costoEnvio,
    monto_total: montoTotal,
    metodo_pago: datos.metodo_pago || 'Efectivo contra entrega',
    estado_pago: datos.estado_pago || 'PENDIENTE',
    repartidor_id: datos.repartidor_id || '',
    repartidor_nombre: datos.repartidor_nombre || '',
    estado: datos.repartidor_id ? 'ASIGNADO' : 'PENDIENTE',
    notas_entrega: datos.notas_entrega || '',
    hora_entrega: '',
    tiempo_entrega_min: ''
  };

  insertarFila(SHEETS.PEDIDOS, nuevoPedido);

  // Si se asignó un repartidor al crearlo, actualizar su estado a EN_RUTA si aplica
  if (datos.repartidor_id) {
    actualizarFila(SHEETS.REPARTIDORES, 'id', datos.repartidor_id, {
      estado: 'EN_RUTA'
    });
  }

  return { success: true, pedido: nuevoPedido };
}

/**
 * Asigna un repartidor a un pedido
 */
function asignarRepartidor(pedidoId, repartidorId) {
  var repartidores = obtenerDatosHoja(SHEETS.REPARTIDORES);
  var repartidor = null;
  for (var i = 0; i < repartidores.length; i++) {
    if (repartidores[i].id === repartidorId) {
      repartidor = repartidores[i];
      break;
    }
  }

  if (!repartidor) {
    return { success: false, message: 'Repartidor no encontrado' };
  }

  var updates = {
    repartidor_id: repartidor.id,
    repartidor_nombre: repartidor.nombre,
    estado: 'ASIGNADO'
  };

  var res = actualizarFila(SHEETS.PEDIDOS, 'id', pedidoId, updates);
  if (res.success) {
    // Si el repartidor estaba ACTIVO, lo pasamos a EN_RUTA
    actualizarFila(SHEETS.REPARTIDORES, 'id', repartidor.id, {
      estado: 'EN_RUTA'
    });
  }

  return { success: true, pedidoId: pedidoId, repartidor: repartidor.nombre };
}

/**
 * Cambia el estado de un pedido y gestiona balance, comisiones y tiempos
 */
function cambiarEstadoPedido(pedidoId, nuevoEstado, extras) {
  extras = extras || {};
  var pedidos = obtenerDatosHoja(SHEETS.PEDIDOS);
  var pedido = null;

  for (var i = 0; i < pedidos.length; i++) {
    if (pedidos[i].id === pedidoId) {
      pedido = pedidos[i];
      break;
    }
  }

  if (!pedido) {
    return { success: false, message: 'Pedido no encontrado' };
  }

  var updates = { estado: nuevoEstado };

  // Cuando se marca como ENTREGADO
  if (nuevoEstado === 'ENTREGADO') {
    var ahora = new Date();
    updates.hora_entrega = ahora.toISOString();

    if (pedido.fecha_creacion) {
      var diffMs = ahora.getTime() - new Date(pedido.fecha_creacion).getTime();
      var diffMins = Math.round(diffMs / 60000);
      updates.tiempo_entrega_min = diffMins > 0 ? diffMins : 1;
    }

    if (extras.notas_adicionales) {
      updates.notas_entrega = (pedido.notas_entrega ? pedido.notas_entrega + ' | ' : '') + extras.notas_adicionales;
    }

    // Actualizar estado de pago
    if (extras.pago_recibido || pedido.metodo_pago.toLowerCase().indexOf('efectivo') === -1) {
      updates.estado_pago = 'PAGADO';
    }

    // Calcular y registrar comisión del repartidor
    if (pedido.repartidor_id) {
      var configs = obtenerConfiguraciones();
      var porcComision = parseFloat(configs.COMISION_PORCENTAJE || 15);
      var costoEnvio = parseFloat(pedido.costo_envio || 0);
      
      // Comisión por defecto: el costo de envío completo o porcentaje configurable
      var comisionGanada = costoEnvio > 0 ? costoEnvio : (parseFloat(pedido.monto_total || 0) * (porcComision / 100));
      comisionGanada = Math.round(comisionGanada * 100) / 100;

      // Buscar repartidor para actualizar balances
      var reps = obtenerDatosHoja(SHEETS.REPARTIDORES);
      var rep = reps.find(function(r) { return r.id === pedido.repartidor_id; });

      if (rep) {
        var nuevoBalanceComisiones = (parseFloat(rep.balance_comisiones) || 0) + comisionGanada;
        var nuevoEfectivoEnMano = parseFloat(rep.efectivo_en_mano) || 0;

        // Si fue en efectivo, el repartidor recaudó el total del pedido
        var esEfectivo = (pedido.metodo_pago || '').toLowerCase().indexOf('efectivo') !== -1;
        if (esEfectivo) {
          nuevoEfectivoEnMano += parseFloat(pedido.monto_total || 0);
          
          // Registrar transacción de efectivo recaudado
          insertarFila(SHEETS.TRANSACCIONES, {
            id: 'TX-' + new Date().getTime().toString().slice(-6),
            fecha: ahora.toISOString(),
            repartidor_id: rep.id,
            repartidor_nombre: rep.nombre,
            tipo: 'EFECTIVO_RECAUDADO',
            monto: parseFloat(pedido.monto_total || 0),
            pedido_id: pedido.id,
            descripcion: 'Efectivo recaudado de cliente por pedido ' + pedido.id,
            registrado_por: extras.registrado_por || 'REPARTIDOR'
          });
        }

        // Registrar transacción de comisión ganada
        insertarFila(SHEETS.TRANSACCIONES, {
          id: 'TX-' + (new Date().getTime() + 1).toString().slice(-6),
          fecha: ahora.toISOString(),
          repartidor_id: rep.id,
          repartidor_nombre: rep.nombre,
          tipo: 'COMISION_GANADA',
          monto: comisionGanada,
          pedido_id: pedido.id,
          descripcion: 'Ganancia por entrega de pedido ' + pedido.id,
          registrado_por: 'SISTEMA'
        });

        // Actualizar datos del repartidor: volver a ACTIVO
        actualizarFila(SHEETS.REPARTIDORES, 'id', rep.id, {
          balance_comisiones: Math.round(nuevoBalanceComisiones * 100) / 100,
          efectivo_en_mano: Math.round(nuevoEfectivoEnMano * 100) / 100,
          estado: 'ACTIVO'
        });
      }
    }
  } else if (nuevoEstado === 'CANCELADO') {
    // Si se cancela y tenía repartidor, liberar al repartidor
    if (pedido.repartidor_id) {
      actualizarFila(SHEETS.REPARTIDORES, 'id', pedido.repartidor_id, {
        estado: 'ACTIVO'
      });
    }
  } else if (nuevoEstado === 'EN_RUTA') {
    if (pedido.repartidor_id) {
      actualizarFila(SHEETS.REPARTIDORES, 'id', pedido.repartidor_id, {
        estado: 'EN_RUTA'
      });
    }
  }

  var res = actualizarFila(SHEETS.PEDIDOS, 'id', pedidoId, updates);
  return { success: res.success, estado: nuevoEstado, updates: updates };
}
