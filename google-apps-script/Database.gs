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
