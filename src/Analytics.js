/**
 * ====================================================================
 * ANALÍTICAS, DASHBOARD Y FINANZAS (ANALYTICS SERVICE)
 * ====================================================================
 */

/**
 * Obtiene métricas agregadas y datos para gráficos del Dashboard
 */
function obtenerDashboardData() {
  var pedidos = obtenerDatosHoja(SHEETS.PEDIDOS);
  var repartidores = obtenerDatosHoja(SHEETS.REPARTIDORES);
  var transacciones = obtenerDatosHoja(SHEETS.TRANSACCIONES);
  var configs = obtenerConfiguraciones();

  var totalPedidos = pedidos.length;
  var entregados = 0;
  var enRuta = 0;
  var pendientes = 0;
  var asignados = 0;
  var cancelados = 0;

  var totalVentasProductos = 0;
  var totalEnvios = 0;
  var tiemposEntrega = [];

  var pedidosPorEstado = {};
  var ventasPorSucursal = {};
  var ventasPorMetodo = {};
  var pedidosPorDia = {};

  // Analizar cada pedido
  pedidos.forEach(function(p) {
    var st = (p.estado || 'PENDIENTE').toUpperCase();
    pedidosPorEstado[st] = (pedidosPorEstado[st] || 0) + 1;

    if (st === 'ENTREGADO') entregados++;
    else if (st === 'EN_RUTA') enRuta++;
    else if (st === 'PENDIENTE') pendientes++;
    else if (st === 'ASIGNADO') asignados++;
    else if (st === 'CANCELADO') cancelados++;

    if (st !== 'CANCELADO') {
      var prod = parseFloat(p.monto_productos) || 0;
      var envio = parseFloat(p.costo_envio) || 0;
      totalVentasProductos += prod;
      totalEnvios += envio;

      // Agrupar por sucursal
      var suc = p.sucursal_nombre || 'Sin Sucursal';
      ventasPorSucursal[suc] = (ventasPorSucursal[suc] || 0) + (prod + envio);

      // Agrupar por método de pago
      var met = p.metodo_pago || 'Otro';
      ventasPorMetodo[met] = (ventasPorMetodo[met] || 0) + (prod + envio);

      // Agrupar por día (últimos 7 días)
      if (p.fecha_creacion) {
        var diaKey = p.fecha_creacion.split('T')[0];
        pedidosPorDia[diaKey] = (pedidosPorDia[diaKey] || 0) + 1;
      }
    }

    if (p.tiempo_entrega_min && parseFloat(p.tiempo_entrega_min) > 0) {
      tiemposEntrega.push(parseFloat(p.tiempo_entrega_min));
    }
  });

  // Tiempo promedio de entrega
  var tiempoPromedio = 0;
  if (tiemposEntrega.length > 0) {
    var sumaTiempos = tiemposEntrega.reduce(function(acc, val) { return acc + val; }, 0);
    tiempoPromedio = Math.round(sumaTiempos / tiemposEntrega.length);
  }

  // Métricas de repartidores y dinero
  var totalComisionesPendientes = 0;
  var totalEfectivoEnCalle = 0;
  var repartidoresActivos = 0;

  var rankingRepartidores = repartidores.map(function(r) {
    var repEntregas = pedidos.filter(function(p) {
      return p.repartidor_id === r.id && p.estado === 'ENTREGADO';
    }).length;

    var com = parseFloat(r.balance_comisiones) || 0;
    var ef = parseFloat(r.efectivo_en_mano) || 0;
    totalComisionesPendientes += com;
    totalEfectivoEnCalle += ef;

    if (r.estado === 'ACTIVO' || r.estado === 'EN_RUTA') {
      repartidoresActivos++;
    }

    return {
      id: r.id,
      nombre: r.nombre,
      vehiculo: r.vehiculo,
      estado: r.estado,
      entregas: repEntregas,
      balance_comisiones: com,
      efectivo_en_mano: ef,
      calificacion: parseFloat(r.calificacion) || 5.0
    };
  });

  // Ordenar ranking por entregas descendente
  rankingRepartidores.sort(function(a, b) { return b.entregas - a.entregas; });

  // Tasa de efectividad de entregas
  var tasaEfectividad = totalPedidos > 0 ? Math.round((entregados / totalPedidos) * 100) : 100;

  return {
    kpis: {
      totalPedidos: totalPedidos,
      entregados: entregados,
      enRuta: enRuta,
      pendientes: pendientes + asignados,
      cancelados: cancelados,
      tasaEfectividad: tasaEfectividad,
      tiempoPromedioMin: tiempoPromedio,
      totalVentasProductos: Math.round(totalVentasProductos * 100) / 100,
      totalEnvios: Math.round(totalEnvios * 100) / 100,
      totalIngresos: Math.round((totalVentasProductos + totalEnvios) * 100) / 100,
      totalComisionesPendientes: Math.round(totalComisionesPendientes * 100) / 100,
      totalEfectivoEnCalle: Math.round(totalEfectivoEnCalle * 100) / 100,
      repartidoresActivos: repartidoresActivos,
      totalRepartidores: repartidores.length
    },
    charts: {
      estados: pedidosPorEstado,
      ventasPorSucursal: ventasPorSucursal,
      ventasPorMetodo: ventasPorMetodo,
      pedidosPorDia: pedidosPorDia
    },
    rankingRepartidores: rankingRepartidores,
    configuracion: configs
  };
}

/**
 * Obtiene el detalle financiero y lista de transacciones
 */
function obtenerReporteFinanzas() {
  var transacciones = obtenerDatosHoja(SHEETS.TRANSACCIONES);
  transacciones.sort(function(a, b) {
    return new Date(b.fecha || 0) - new Date(a.fecha || 0);
  });

  var repartidores = obtenerDatosHoja(SHEETS.REPARTIDORES);
  var resumenRepartidores = repartidores.map(function(r) {
    return {
      id: r.id,
      nombre: r.nombre,
      balance_comisiones: parseFloat(r.balance_comisiones) || 0,
      efectivo_en_mano: parseFloat(r.efectivo_en_mano) || 0
    };
  });

  return {
    transacciones: transacciones.slice(0, 50),
    resumenRepartidores: resumenRepartidores
  };
}

/**
 * Actualiza configuraciones generales del sistema
 */
function guardarConfiguraciones(nuevasConfigs) {
  for (var key in nuevasConfigs) {
    actualizarFila(SHEETS.CONFIGURACION, 'clave', key, { valor: nuevasConfigs[key] });
  }
  return { success: true };
}
