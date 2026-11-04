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
