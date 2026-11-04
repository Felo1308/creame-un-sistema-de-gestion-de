/**
 * ====================================================================
 * SISTEMA DE GESTIÓN DE ENTREGAS A DOMICILIO - BASE DE DATOS
 * Google Apps Script + Google Sheets
 * ====================================================================
 */

var SHEETS = {
  PEDIDOS: 'PEDIDOS',
  REPARTIDORES: 'REPARTIDORES',
  SUCURSALES: 'SUCURSALES',
  METODOS_PAGO: 'METODOS_PAGO',
  TRANSACCIONES: 'TRANSACCIONES_BALANCE',
  CONFIGURACION: 'CONFIGURACION'
};

/**
 * Obtiene el Spreadsheet activo o el configurado por ID en ScriptProperties
 */
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('SPREADSHEET_ID');
  
  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId);
    } catch (e) {
      Logger.log('Error abriendo spreadsheet por ID: ' + e.message);
    }
  }
  
  // Si está vinculado a un Sheet (Container-bound)
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {
    Logger.log('No es container-bound: ' + e.message);
  }

  // Si no existe, crear uno nuevo automáticamente
  var newSheet = SpreadsheetApp.create('DeliveryPro_DB');
  props.setProperty('SPREADSHEET_ID', newSheet.getId());
  Logger.log('Nuevo Spreadsheet creado con ID: ' + newSheet.getId());
  return newSheet;
}

/**
 * Inicializa todas las hojas, columnas y datos demo si no existen
 */
function inicializarBaseDeDatos() {
  var ss = getSpreadsheet();
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    // 1. CONFIGURACION
    var configSheet = obtenerOCrearHoja(ss, SHEETS.CONFIGURACION);
    if (configSheet.getLastRow() === 0) {
      configSheet.appendRow(['clave', 'valor', 'descripcion']);
      configSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
      
      var defaultConfigs = [
        ['NOMBRE_NEGOCIO', 'Delivery Express Pro', 'Nombre comercial de la empresa'],
        ['MONEDA', '$', 'Símbolo de moneda'],
        ['COMISION_PORCENTAJE', '15', 'Comisión promedio para repartidor (%)'],
        ['COSTO_ENVIO_BASE', '3.50', 'Tarifa base de entrega'],
        ['LATITUD_CENTRAL', '4.60971', 'Latitud central por defecto en mapa'],
        ['LONGITUD_CENTRAL', '-74.08175', 'Longitud central por defecto en mapa'],
        ['ZOOM_MAPA', '13', 'Nivel de zoom inicial'],
        ['TIEMPO_PROMEDIO_MIN', '35', 'Tiempo de entrega promedio objetivo (minutos)']
      ];
      defaultConfigs.forEach(function(row) { configSheet.appendRow(row); });
    }

    // 2. SUCURSALES
    var sucSheet = obtenerOCrearHoja(ss, SHEETS.SUCURSALES);
    if (sucSheet.getLastRow() === 0) {
      sucSheet.appendRow([
        'id', 'nombre', 'direccion', 'telefono', 'latitud', 'longitud', 
        'encargado', 'radio_cobertura_km', 'activo', 'fecha_creacion'
      ]);
      sucSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');

      var defaultSucursales = [
        ['SUC-01', 'Sucursal Centro', 'Cra. 7 #32-16, Zona Centro', '+57 300 123 4567', 4.60971, -74.08175, 'Carlos Gómez', 8, 'SI', new Date().toISOString()],
        ['SUC-02', 'Sucursal Norte', 'Calle 116 #19-45, Usaquén', '+57 310 987 6543', 4.69850, -74.03210, 'Mariana López', 10, 'SI', new Date().toISOString()],
        ['SUC-03', 'Sucursal Chapinero', 'Calle 67 #9-20, Chapinero', '+57 320 555 7890', 4.65320, -74.06200, 'Andrés Silva', 6, 'SI', new Date().toISOString()]
      ];
      defaultSucursales.forEach(function(row) { sucSheet.appendRow(row); });
    }

    // 3. METODOS_PAGO
    var mpSheet = obtenerOCrearHoja(ss, SHEETS.METODOS_PAGO);
    if (mpSheet.getLastRow() === 0) {
      mpSheet.appendRow(['id', 'nombre', 'tipo', 'instrucciones', 'activo']);
      mpSheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');

      var defaultMP = [
        ['MP-01', 'Efectivo contra entrega', 'EFECTIVO', 'Cobrar al cliente en efectivo y rendir a caja', 'SI'],
        ['MP-02', 'Tarjeta Débito/Crédito (Datafono)', 'TARJETA', 'Llevar terminal POS inalámbrico', 'SI'],
        ['MP-03', 'Transferencia Bancaria / QR', 'TRANSFERENCIA', 'Validar comprobante en WhatsApp antes de entregar', 'SI'],
        ['MP-04', 'Billetera Digital (Yape / Nequi / Plin)', 'DIGITAL', 'Pago confirmado previo al despacho', 'SI']
      ];
      defaultMP.forEach(function(row) { mpSheet.appendRow(row); });
    }

    // 4. REPARTIDORES
    var repSheet = obtenerOCrearHoja(ss, SHEETS.REPARTIDORES);
    if (repSheet.getLastRow() === 0) {
      repSheet.appendRow([
        'id', 'nombre', 'telefono', 'vehiculo', 'placa', 'pin', 
        'estado', 'latitud', 'longitud', 'ultima_actualizacion', 
        'balance_comisiones', 'efectivo_en_mano', 'calificacion', 'foto_url'
      ]);
      repSheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');

      var defaultRepartidores = [
        ['REP-01', 'Juan Martínez', '+57 301 234 5678', 'Moto', 'ABC-12D', '1234', 'ACTIVO', 4.61500, -74.07500, new Date().toISOString(), 45.50, 68.00, 4.9, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'],
        ['REP-02', 'Brayan Rodríguez', '+57 312 345 6789', 'Moto', 'XYZ-98F', '2345', 'EN_RUTA', 4.68500, -74.04500, new Date().toISOString(), 32.00, 42.50, 4.8, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'],
        ['REP-03', 'Mateo Morales', '+57 318 765 4321', 'Bicicleta', 'BICI-03', '3456', 'ACTIVO', 4.64800, -74.06000, new Date().toISOString(), 28.00, 0.00, 5.0, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'],
        ['REP-04', 'Camila Benítez', '+57 315 444 3322', 'Moto', 'KLM-45E', '4567', 'DESCONECTADO', 4.62200, -74.08800, new Date().toISOString(), 15.00, 0.00, 4.7, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150']
      ];
      defaultRepartidores.forEach(function(row) { repSheet.appendRow(row); });
    }

    // 5. PEDIDOS
    var pedSheet = obtenerOCrearHoja(ss, SHEETS.PEDIDOS);
    if (pedSheet.getLastRow() === 0) {
      pedSheet.appendRow([
        'id', 'fecha_creacion', 'cliente_nombre', 'cliente_telefono', 
        'cliente_direccion', 'cliente_lat', 'cliente_lng', 'sucursal_id', 
        'sucursal_nombre', 'items_detalle', 'monto_productos', 'costo_envio', 
        'monto_total', 'metodo_pago', 'estado_pago', 'repartidor_id', 
        'repartidor_nombre', 'estado', 'notas_entrega', 'hora_entrega', 'tiempo_entrega_min'
      ]);
      pedSheet.getRange(1, 1, 1, 21).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');

      var now = new Date();
      var hace30m = new Date(now.getTime() - 30 * 60000).toISOString();
      var hace15m = new Date(now.getTime() - 15 * 60000).toISOString();
      var hace1h = new Date(now.getTime() - 60 * 60000).toISOString();

      var defaultPedidos = [
        [
          'PED-1001', hace1h, 'Lucía Fernández', '+57 300 999 1122',
          'Calle 45 #13-35 Apt 402', 4.6280, -74.0680, 'SUC-01',
          'Sucursal Centro', '2x Burger Doble Queso, 1x Papas Rústicas, 1x Gaseosa',
          22.50, 3.50, 26.00, 'Efectivo contra entrega', 'PAGADO', 'REP-01',
          'Juan Martínez', 'ENTREGADO', 'Tocar citófono 402', new Date().toISOString(), 28
        ],
        [
          'PED-1002', hace30m, 'Diego Sánchez', '+57 311 222 3344',
          'Cra 15 #119-12 Torre B', 4.6950, -74.0350, 'SUC-02',
          'Sucursal Norte', '1x Pizza Familiar 4 Quesos, 1x Alitas BBQ (12 und)',
          28.00, 4.00, 32.00, 'Tarjeta Débito/Crédito (Datafono)', 'PENDIENTE', 'REP-02',
          'Brayan Rodríguez', 'EN_RUTA', 'Dejar en recepción con vigilante', '', ''
        ],
        [
          'PED-1003', hace15m, 'Carolina Vega', '+57 314 888 7766',
          'Calle 63 #7-40 Int 3', 4.6490, -74.0610, 'SUC-03',
          'Sucursal Chapinero', '3x Bowls de Pollo Teriyaki, 3x Jugos Naturales',
          35.00, 3.50, 38.50, 'Billetera Digital (Yape / Nequi / Plin)', 'PAGADO', 'REP-03',
          'Mateo Morales', 'ASIGNADO', 'Timbre directo a la casa', '', ''
        ],
        [
          'PED-1004', new Date().toISOString(), 'Esteban Restrepo', '+57 317 444 8899',
          'Cra 8 #35-60', 4.6180, -74.0720, 'SUC-01',
          'Sucursal Centro', '1x Combo Familiar Parrilla, 2x Cervezas',
          42.00, 3.50, 45.50, 'Efectivo contra entrega', 'PENDIENTE', '',
          '', 'PENDIENTE', 'Llamar al llegar porque el timbre falla', '', ''
        ]
      ];
      defaultPedidos.forEach(function(row) { pedSheet.appendRow(row); });
    }

    // 6. TRANSACCIONES_BALANCE
    var txSheet = obtenerOCrearHoja(ss, SHEETS.TRANSACCIONES);
    if (txSheet.getLastRow() === 0) {
      txSheet.appendRow([
        'id', 'fecha', 'repartidor_id', 'repartidor_nombre', 
        'tipo', 'monto', 'pedido_id', 'descripcion', 'registrado_por'
      ]);
      txSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');

      var defaultTx = [
        ['TX-101', new Date().toISOString(), 'REP-01', 'Juan Martínez', 'COMISION_GANADA', 3.50, 'PED-1001', 'Comisión por entrega de pedido', 'SISTEMA'],
        ['TX-102', new Date().toISOString(), 'REP-01', 'Juan Martínez', 'EFECTIVO_RECAUDADO', 26.00, 'PED-1001', 'Efectivo cobrado al cliente', 'REP-01']
      ];
      defaultTx.forEach(function(row) { txSheet.appendRow(row); });
    }

    return { success: true, message: 'Base de datos inicializada correctamente', spreadsheetUrl: ss.getUrl() };
  } catch (error) {
    Logger.log('Error inicializando base de datos: ' + error.toString());
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Obtiene o crea una hoja con formato
 */
function obtenerOCrearHoja(ss, nombre) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
  }
  return sheet;
}

/**
 * Retorna todos los registros de una hoja como array de objetos
 */
function obtenerDatosHoja(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val instanceof Date) {
        val = val.toISOString();
      }
      obj[headers[j]] = val;
    }
    // Añadimos el número de fila física en Google Sheets
    obj._rowIndex = i + 1;
    rows.push(obj);
  }

  return rows;
}

/**
 * Agrega una fila a la hoja a partir de un objeto
 */
function insertarFila(sheetName, obj) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = [];

  for (var j = 0; j < headers.length; j++) {
    var header = headers[j];
    var val = obj[header];
    if (val === undefined || val === null) {
      val = '';
    }
    newRow.push(val);
  }

  sheet.appendRow(newRow);
  return { success: true, rowIndex: sheet.getLastRow() };
}

/**
 * Actualiza una fila que coincida con una columna y valor específico
 */
function actualizarFila(sheetName, idField, idValue, updates) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: 'Hoja vacía' };

  var headers = data[0];
  var idColIdx = headers.indexOf(idField);
  if (idColIdx === -1) throw new Error('Columna ID no encontrada: ' + idField);

  var targetRowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(idValue)) {
      targetRowIdx = i + 1; // 1-based index
      break;
    }
  }

  if (targetRowIdx === -1) {
    return { success: false, message: 'Registro no encontrado con ' + idField + '=' + idValue };
  }

  // Actualizar columnas indicadas
  for (var key in updates) {
    var colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      var val = updates[key];
      if (val === undefined || val === null) val = '';
      sheet.getRange(targetRowIdx, colIdx + 1).setValue(val);
    }
  }

  return { success: true, targetRow: targetRowIdx };
}

/**
 * Elimina una fila por su ID
 */
function eliminarFila(sheetName, idField, idValue) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: 'Hoja vacía' };

  var headers = data[0];
  var idColIdx = headers.indexOf(idField);
  if (idColIdx === -1) throw new Error('Columna ID no encontrada: ' + idField);

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(idValue)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, message: 'Registro no encontrado' };
}

/**
 * Obtiene toda la configuración del sistema como un diccionario
 */
function obtenerConfiguraciones() {
  var rows = obtenerDatosHoja(SHEETS.CONFIGURACION);
  var config = {};
  rows.forEach(function(r) {
    config[r.clave] = r.valor;
  });
  return config;
}
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
/**
 * ====================================================================
 * SISTEMA DE GESTIÓN DE ENTREGAS A DOMICILIO - CONTROLADOR PRINCIPAL
 * Google Apps Script Web App Router & Endpoints
 * ====================================================================
 */

/**
 * Servidor Web: Sirve la aplicación SPA HTML5 Responsive
 */
function doGet(e) {
  e = e || { parameter: {} };

  // Inicializar automáticamente si es la primera ejecución
  try {
    var ss = getSpreadsheet();
    if (!ss.getSheetByName(SHEETS.PEDIDOS)) {
      inicializarBaseDeDatos();
    }
  } catch (err) {
    Logger.log('Init check: ' + err.toString());
  }

  // Soporte para API REST GET directa
  if (e.parameter && e.parameter.api === 'true') {
    return handleRestApiGet(e.parameter);
  }

  // Renderizar la SPA HTML
  var template = HtmlService.createTemplateFromFile('Index');
  template.initialView = e.parameter.portal || 'admin';
  template.initialDriverId = e.parameter.driverId || '';

  return template.evaluate()
    .setTitle('DeliveryPro - Sistema de Gestión de Entregas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Servidor Web: Maneja peticiones POST (API JSON REST para Apps externas o móviles)
 */
function doPost(e) {
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || (e.parameter ? e.parameter.action : '');
    var data = body.data || body;
    var result = ejecutarAccion(action, data);

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Despachador de acciones (utilizado por doPost y por google.script.run)
 */
function ejecutarAccion(action, data) {
  switch (action) {
    case 'getInitialData':
      return apiGetInitialData();
    case 'getOrders':
      return { success: true, pedidos: obtenerPedidos(data) };
    case 'createOrder':
      return crearPedido(data);
    case 'assignDriver':
      return asignarRepartidor(data.pedidoId, data.repartidorId);
    case 'updateOrderStatus':
      return cambiarEstadoPedido(data.pedidoId, data.nuevoEstado, data.extras);
    case 'getDrivers':
      return { success: true, repartidores: obtenerRepartidores() };
    case 'saveDriver':
      return guardarRepartidor(data);
    case 'authenticateDriver':
      return autenticarRepartidor(data.pinOId);
    case 'updateDriverLocation':
      return actualizarUbicacionRepartidor(data.repartidorId, data.lat, data.lng);
    case 'getDriverPortalData':
      return apiGetDriverPortalData(data.repartidorId);
    case 'settleDriverBalance':
      return liquidarBalanceRepartidor(data.repartidorId, data.montoComisiones, data.montoEfectivo, data.notas);
    case 'getBranches':
      return { success: true, sucursales: obtenerSucursales() };
    case 'saveBranch':
      return guardarSucursal(data);
    case 'deleteBranch':
      return eliminarSucursal(data.id);
    case 'getPaymentMethods':
      return { success: true, metodosPago: obtenerMetodosPago() };
    case 'savePaymentMethod':
      return guardarMetodoPago(data);
    case 'deletePaymentMethod':
      return eliminarMetodoPago(data.id);
    case 'getDashboard':
      return { success: true, dashboard: obtenerDashboardData() };
    case 'getFinanceReport':
      return { success: true, finanzas: obtenerReporteFinanzas() };
    case 'saveSettings':
      return guardarConfiguraciones(data);
    case 'initDatabase':
      return inicializarBaseDeDatos();
    default:
      return { success: false, message: 'Acción desconocida: ' + action };
  }
}

/**
 * Endpoint de carga inicial para una respuesta súper rápida en frontend
 */
function apiGetInitialData() {
  try {
    return {
      success: true,
      config: obtenerConfiguraciones(),
      sucursales: obtenerSucursales(),
      metodosPago: obtenerMetodosPago(),
      repartidores: obtenerRepartidores(),
      dashboard: obtenerDashboardData(),
      pedidos: obtenerPedidos()
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Endpoints específicos llamados directamente por google.script.run
 */
function apiGetOrders(filtros) { return ejecutarAccion('getOrders', filtros); }
function apiCreateOrder(datos) { return ejecutarAccion('createOrder', datos); }
function apiAssignDriver(pedidoId, repartidorId) { return ejecutarAccion('assignDriver', { pedidoId: pedidoId, repartidorId: repartidorId }); }
function apiUpdateOrderStatus(pedidoId, nuevoEstado, extras) { return ejecutarAccion('updateOrderStatus', { pedidoId: pedidoId, nuevoEstado: nuevoEstado, extras: extras }); }
function apiGetDrivers() { return ejecutarAccion('getDrivers', {}); }
function apiSaveDriver(datos) { return ejecutarAccion('saveDriver', datos); }
function apiAuthenticateDriver(pinOId) { return ejecutarAccion('authenticateDriver', { pinOId: pinOId }); }
function apiUpdateDriverLocation(repartidorId, lat, lng) { return ejecutarAccion('updateDriverLocation', { repartidorId: repartidorId, lat: lat, lng: lng }); }

function apiGetDriverPortalData(repartidorId) {
  var reps = obtenerRepartidores();
  var rep = reps.find(function(r) { return r.id === repartidorId; });
  var pedidos = obtenerPedidosRepartidor(repartidorId);
  return {
    success: true,
    repartidor: rep,
    activos: pedidos.activos,
    historial: pedidos.historial
  };
}

function apiSettleDriverBalance(repartidorId, comisiones, efectivo, notas) {
  return ejecutarAccion('settleDriverBalance', {
    repartidorId: repartidorId,
    montoComisiones: comisiones,
    montoEfectivo: efectivo,
    notas: notas
  });
}

function apiGetBranches() { return ejecutarAccion('getBranches', {}); }
function apiSaveBranch(datos) { return ejecutarAccion('saveBranch', datos); }
function apiDeleteBranch(id) { return ejecutarAccion('deleteBranch', { id: id }); }
function apiGetPaymentMethods() { return ejecutarAccion('getPaymentMethods', {}); }
function apiSavePaymentMethod(datos) { return ejecutarAccion('savePaymentMethod', datos); }
function apiDeletePaymentMethod(id) { return ejecutarAccion('deletePaymentMethod', { id: id }); }
function apiGetDashboard() { return ejecutarAccion('getDashboard', {}); }
function apiGetFinanceReport() { return ejecutarAccion('getFinanceReport', {}); }
function apiSaveSettings(settings) { return ejecutarAccion('saveSettings', settings); }
function apiInitDatabase() { return inicializarBaseDeDatos(); }

/**
 * Maneja peticiones REST GET
 */
function handleRestApiGet(param) {
  var action = param.action || 'getDashboard';
  var res = ejecutarAccion(action, param);
  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Función para incluir código HTML o JS parcial
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
