/**
 * ====================================================================
 * GESTIÓN DE SUCURSALES Y MÉTODOS DE PAGO (BRANCHES SERVICE)
 * ====================================================================
 */

/**
 * Obtiene todas las sucursales
 */
function obtenerSucursales() {
  var rows = obtenerDatosHoja(SHEETS.SUCURSALES);
  return rows.map(function(s) {
    return {
      id: s.id,
      nombre: s.nombre,
      direccion: s.direccion,
      telefono: s.telefono,
      latitud: parseFloat(s.latitud) || 0,
      longitud: parseFloat(s.longitud) || 0,
      encargado: s.encargado,
      radio_cobertura_km: parseFloat(s.radio_cobertura_km) || 5,
      activo: s.activo || 'SI'
    };
  });
}

/**
 * Crea o actualiza una sucursal
 */
function guardarSucursal(datos) {
  if (datos.id) {
    var res = actualizarFila(SHEETS.SUCURSALES, 'id', datos.id, {
      nombre: datos.nombre,
      direccion: datos.direccion,
      telefono: datos.telefono,
      latitud: parseFloat(datos.latitud) || 0,
      longitud: parseFloat(datos.longitud) || 0,
      encargado: datos.encargado,
      radio_cobertura_km: parseFloat(datos.radio_cobertura_km) || 5,
      activo: datos.activo || 'SI'
    });
    return { success: res.success, id: datos.id };
  } else {
    var sucursales = obtenerDatosHoja(SHEETS.SUCURSALES);
    var nuevoId = 'SUC-0' + (sucursales.length + 1);
    var nueva = {
      id: nuevoId,
      nombre: datos.nombre,
      direccion: datos.direccion,
      telefono: datos.telefono,
      latitud: parseFloat(datos.latitud) || 0,
      longitud: parseFloat(datos.longitud) || 0,
      encargado: datos.encargado,
      radio_cobertura_km: parseFloat(datos.radio_cobertura_km) || 5,
      activo: datos.activo || 'SI',
      fecha_creacion: new Date().toISOString()
    };
    insertarFila(SHEETS.SUCURSALES, nueva);
    return { success: true, id: nuevoId };
  }
}

/**
 * Elimina una sucursal
 */
function eliminarSucursal(id) {
  return eliminarFila(SHEETS.SUCURSALES, 'id', id);
}

/**
 * Obtiene todos los métodos de pago
 */
function obtenerMetodosPago() {
  return obtenerDatosHoja(SHEETS.METODOS_PAGO);
}

/**
 * Crea o actualiza un método de pago
 */
function guardarMetodoPago(datos) {
  if (datos.id) {
    var res = actualizarFila(SHEETS.METODOS_PAGO, 'id', datos.id, {
      nombre: datos.nombre,
      tipo: datos.tipo,
      instrucciones: datos.instrucciones,
      activo: datos.activo || 'SI'
    });
    return { success: res.success, id: datos.id };
  } else {
    var mps = obtenerDatosHoja(SHEETS.METODOS_PAGO);
    var nuevoId = 'MP-0' + (mps.length + 1);
    var nuevo = {
      id: nuevoId,
      nombre: datos.nombre,
      tipo: datos.tipo,
      instrucciones: datos.instrucciones,
      activo: datos.activo || 'SI'
    };
    insertarFila(SHEETS.METODOS_PAGO, nuevo);
    return { success: true, id: nuevoId };
  }
}

/**
 * Elimina un método de pago
 */
function eliminarMetodoPago(id) {
  return eliminarFila(SHEETS.METODOS_PAGO, 'id', id);
}
