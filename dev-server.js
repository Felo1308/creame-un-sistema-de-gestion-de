/**
 * ====================================================================
 * SERVIDOR DE DESARROLLO Y PRUEBAS LOCALES (ZERO DEPENDENCIES)
 * ====================================================================
 * Permite ejecutar y probar la aplicación web y móvil localmente en el navegador
 * antes de desplegar en Google Apps Script.
 * 
 * Uso: node dev-server.js
 * Abre: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Base de datos en memoria para pruebas locales
const DB = {
  config: {
    NOMBRE_NEGOCIO: 'Delivery Express Pro',
    MONEDA: '$',
    COMISION_PORCENTAJE: '15',
    COSTO_ENVIO_BASE: '3.50',
    LATITUD_CENTRAL: '4.60971',
    LONGITUD_CENTRAL: '-74.08175',
    ZOOM_MAPA: '13',
    TIEMPO_PROMEDIO_MIN: '35'
  },
  sucursales: [
    { id: 'SUC-01', nombre: 'Sucursal Centro', direccion: 'Cra. 7 #32-16, Zona Centro', telefono: '+57 300 123 4567', latitud: 4.60971, longitud: -74.08175, encargado: 'Carlos Gómez', radio_cobertura_km: 8, activo: 'SI' },
    { id: 'SUC-02', nombre: 'Sucursal Norte', direccion: 'Calle 116 #19-45, Usaquén', telefono: '+57 310 987 6543', latitud: 4.69850, longitud: -74.03210, encargado: 'Mariana López', radio_cobertura_km: 10, activo: 'SI' },
    { id: 'SUC-03', nombre: 'Sucursal Chapinero', direccion: 'Calle 67 #9-20, Chapinero', telefono: '+57 320 555 7890', latitud: 4.65320, longitud: -74.06200, encargado: 'Andrés Silva', radio_cobertura_km: 6, activo: 'SI' }
  ],
  metodosPago: [
    { id: 'MP-01', nombre: 'Efectivo contra entrega', tipo: 'EFECTIVO', instrucciones: 'Cobrar al cliente en efectivo y rendir a caja', activo: 'SI' },
    { id: 'MP-02', nombre: 'Tarjeta Débito/Crédito (Datafono)', tipo: 'TARJETA', instrucciones: 'Llevar terminal POS inalámbrico', activo: 'SI' },
    { id: 'MP-03', nombre: 'Transferencia Bancaria / QR', tipo: 'TRANSFERENCIA', instrucciones: 'Validar comprobante en WhatsApp', activo: 'SI' },
    { id: 'MP-04', nombre: 'Billetera Digital (Yape / Nequi / Plin)', tipo: 'DIGITAL', instrucciones: 'Pago confirmado previo al despacho', activo: 'SI' }
  ],
  repartidores: [
    { id: 'REP-01', nombre: 'Juan Martínez', telefono: '+57 301 234 5678', vehiculo: 'Moto', placa: 'ABC-12D', pin: '1234', estado: 'ACTIVO', latitud: 4.61500, longitud: -74.07500, balance_comisiones: 45.50, efectivo_en_mano: 68.00, calificacion: 4.9, foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { id: 'REP-02', nombre: 'Brayan Rodríguez', telefono: '+57 312 345 6789', vehiculo: 'Moto', placa: 'XYZ-98F', pin: '2345', estado: 'EN_RUTA', latitud: 4.68500, longitud: -74.04500, balance_comisiones: 32.00, efectivo_en_mano: 42.50, calificacion: 4.8, foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { id: 'REP-03', nombre: 'Mateo Morales', telefono: '+57 318 765 4321', vehiculo: 'Bicicleta', placa: 'BICI-03', pin: '3456', estado: 'ACTIVO', latitud: 4.64800, longitud: -74.06000, balance_comisiones: 28.00, efectivo_en_mano: 0.00, calificacion: 5.0, foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { id: 'REP-04', nombre: 'Camila Benítez', telefono: '+57 315 444 3322', vehiculo: 'Moto', placa: 'KLM-45E', pin: '4567', estado: 'DESCONECTADO', latitud: 4.62200, longitud: -74.08800, balance_comisiones: 15.00, efectivo_en_mano: 0.00, calificacion: 4.7, foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' }
  ],
  pedidos: [
    {
      id: 'PED-1001', fecha_creacion: new Date(Date.now() - 3600000).toISOString(), cliente_nombre: 'Lucía Fernández', cliente_telefono: '+57 300 999 1122',
      cliente_direccion: 'Calle 45 #13-35 Apt 402', cliente_lat: 4.6280, cliente_lng: -74.0680, sucursal_id: 'SUC-01',
      sucursal_nombre: 'Sucursal Centro', items_detalle: '2x Burger Doble Queso, 1x Papas Rústicas, 1x Gaseosa',
      monto_productos: 22.50, costo_envio: 3.50, monto_total: 26.00, metodo_pago: 'Efectivo contra entrega', estado_pago: 'PAGADO',
      repartidor_id: 'REP-01', repartidor_nombre: 'Juan Martínez', estado: 'ENTREGADO', notas_entrega: 'Tocar citófono 402', tiempo_entrega_min: 28
    },
    {
      id: 'PED-1002', fecha_creacion: new Date(Date.now() - 1800000).toISOString(), cliente_nombre: 'Diego Sánchez', cliente_telefono: '+57 311 222 3344',
      cliente_direccion: 'Cra 15 #119-12 Torre B', cliente_lat: 4.6950, cliente_lng: -74.0350, sucursal_id: 'SUC-02',
      sucursal_nombre: 'Sucursal Norte', items_detalle: '1x Pizza Familiar 4 Quesos, 1x Alitas BBQ (12 und)',
      monto_productos: 28.00, costo_envio: 4.00, monto_total: 32.00, metodo_pago: 'Tarjeta Débito/Crédito (Datafono)', estado_pago: 'PENDIENTE',
      repartidor_id: 'REP-02', repartidor_nombre: 'Brayan Rodríguez', estado: 'EN_RUTA', notas_entrega: 'Dejar en recepción con vigilante'
    },
    {
      id: 'PED-1003', fecha_creacion: new Date(Date.now() - 900000).toISOString(), cliente_nombre: 'Carolina Vega', cliente_telefono: '+57 314 888 7766',
      cliente_direccion: 'Calle 63 #7-40 Int 3', cliente_lat: 4.6490, cliente_lng: -74.0610, sucursal_id: 'SUC-03',
      sucursal_nombre: 'Sucursal Chapinero', items_detalle: '3x Bowls de Pollo Teriyaki, 3x Jugos Naturales',
      monto_productos: 35.00, costo_envio: 3.50, monto_total: 38.50, metodo_pago: 'Billetera Digital (Yape / Nequi / Plin)', estado_pago: 'PAGADO',
      repartidor_id: 'REP-03', repartidor_nombre: 'Mateo Morales', estado: 'ASIGNADO', notas_entrega: 'Timbre directo a la casa'
    },
    {
      id: 'PED-1004', fecha_creacion: new Date().toISOString(), cliente_nombre: 'Esteban Restrepo', cliente_telefono: '+57 317 444 8899',
      cliente_direccion: 'Cra 8 #35-60', cliente_lat: 4.6180, cliente_lng: -74.0720, sucursal_id: 'SUC-01',
      sucursal_nombre: 'Sucursal Centro', items_detalle: '1x Combo Familiar Parrilla, 2x Cervezas',
      monto_productos: 42.00, costo_envio: 3.50, monto_total: 45.50, metodo_pago: 'Efectivo contra entrega', estado_pago: 'PENDIENTE',
      repartidor_id: '', repartidor_nombre: '', estado: 'PENDIENTE', notas_entrega: 'Llamar al llegar'
    }
  ],
  transacciones: [
    { id: 'TX-101', fecha: new Date(Date.now() - 3600000).toISOString(), repartidor_id: 'REP-01', repartidor_nombre: 'Juan Martínez', tipo: 'COMISION_GANADA', monto: 3.50, pedido_id: 'PED-1001', descripcion: 'Comisión por entrega', registrado_por: 'SISTEMA' },
    { id: 'TX-102', fecha: new Date(Date.now() - 3600000).toISOString(), repartidor_id: 'REP-01', repartidor_nombre: 'Juan Martínez', tipo: 'EFECTIVO_RECAUDADO', monto: 26.00, pedido_id: 'PED-1001', descripcion: 'Efectivo de cliente', registrado_por: 'REP-01' }
  ]
};

function calcularDashboard() {
  let prod = 0, env = 0, ent = 0, enR = 0, pen = 0, can = 0;
  let est = {}, met = {}, suc = {};

  DB.pedidos.forEach(p => {
    est[p.estado] = (est[p.estado] || 0) + 1;
    if (p.estado === 'ENTREGADO') ent++;
    else if (p.estado === 'EN_RUTA') enR++;
    else if (p.estado === 'PENDIENTE' || p.estado === 'ASIGNADO') pen++;
    else if (p.estado === 'CANCELADO') can++;

    if (p.estado !== 'CANCELADO') {
      prod += (p.monto_productos || 0);
      env += (p.costo_envio || 0);
      met[p.metodo_pago] = (met[p.metodo_pago] || 0) + (p.monto_total || 0);
      suc[p.sucursal_nombre] = (suc[p.sucursal_nombre] || 0) + (p.monto_total || 0);
    }
  });

  let com = 0, ef = 0;
  DB.repartidores.forEach(r => {
    com += (r.balance_comisiones || 0);
    ef += (r.efectivo_en_mano || 0);
  });

  return {
    kpis: {
      totalPedidos: DB.pedidos.length,
      entregados: ent,
      enRuta: enR,
      pendientes: pen,
      cancelados: can,
      tasaEfectividad: DB.pedidos.length > 0 ? Math.round((ent / DB.pedidos.length) * 100) : 100,
      tiempoPromedioMin: 30,
      totalVentasProductos: prod,
      totalEnvios: env,
      totalIngresos: prod + env,
      totalComisionesPendientes: com,
      totalEfectivoEnCalle: ef,
      repartidoresActivos: DB.repartidores.filter(r => r.estado !== 'DESCONECTADO').length,
      totalRepartidores: DB.repartidores.length
    },
    charts: {
      estados: est,
      ventasPorMetodo: met,
      ventasPorSucursal: suc
    },
    rankingRepartidores: DB.repartidores.map(r => ({
      id: r.id,
      nombre: r.nombre,
      vehiculo: r.vehiculo,
      estado: r.estado,
      entregas: DB.pedidos.filter(p => p.repartidor_id === r.id && p.estado === 'ENTREGADO').length,
      balance_comisiones: r.balance_comisiones,
      efectivo_en_mano: r.efectivo_en_mano,
      calificacion: r.calificacion || 5.0
    }))
  };
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // API Endpoint POST
  if (url === '/api' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const action = payload.action;
        const data = payload.data || {};
        let result = { success: true };

        if (action === 'getInitialData') {
          result = {
            success: true,
            config: DB.config,
            sucursales: DB.sucursales,
            metodosPago: DB.metodosPago,
            repartidores: DB.repartidores,
            pedidos: DB.pedidos,
            dashboard: calcularDashboard()
          };
        } else if (action === 'createOrder') {
          const id = 'PED-' + (1000 + DB.pedidos.length + 1);
          const nuevo = {
            ...data,
            id: id,
            fecha_creacion: new Date().toISOString(),
            monto_total: (data.monto_productos || 0) + (data.costo_envio || 0),
            estado: data.repartidor_id ? 'ASIGNADO' : 'PENDIENTE'
          };
          DB.pedidos.unshift(nuevo);
          result = { success: true, pedido: nuevo };
        } else if (action === 'assignDriver') {
          const ped = DB.pedidos.find(p => p.id === data.pedidoId);
          const rep = DB.repartidores.find(r => r.id === data.repartidorId);
          if (ped && rep) {
            ped.repartidor_id = rep.id;
            ped.repartidor_nombre = rep.nombre;
            ped.estado = 'ASIGNADO';
            rep.estado = 'EN_RUTA';
          }
          result = { success: true, repartidor: rep ? rep.nombre : '' };
        } else if (action === 'updateOrderStatus') {
          const ped = DB.pedidos.find(p => p.id === data.pedidoId);
          if (ped) {
            ped.estado = data.nuevoEstado;
            if (data.nuevoEstado === 'ENTREGADO') {
              ped.estado_pago = 'PAGADO';
              if (ped.repartidor_id) {
                const rep = DB.repartidores.find(r => r.id === ped.repartidor_id);
                if (rep) {
                  rep.balance_comisiones += (ped.costo_envio || 3.50);
                  if ((ped.metodo_pago || '').toLowerCase().includes('efectivo')) {
                    rep.efectivo_en_mano += (ped.monto_total || 0);
                  }
                  rep.estado = 'ACTIVO';
                }
              }
            }
          }
          result = { success: true };
        } else if (action === 'updateDriverLocation') {
          const rep = DB.repartidores.find(r => r.id === data.repartidorId);
          if (rep) {
            rep.latitud = data.lat;
            rep.longitud = data.lng;
          }
          result = { success: true };
        } else if (action === 'settleDriverBalance') {
          const rep = DB.repartidores.find(r => r.id === data.repartidorId);
          if (rep) {
            rep.balance_comisiones = Math.max(0, rep.balance_comisiones - (data.montoComisiones || 0));
            rep.efectivo_en_mano = Math.max(0, rep.efectivo_en_mano - (data.montoEfectivo || 0));
          }
          result = { success: true };
        } else if (action === 'saveBranch') {
          if (data.id) {
            const idx = DB.sucursales.findIndex(s => s.id === data.id);
            if (idx !== -1) DB.sucursales[idx] = { ...DB.sucursales[idx], ...data };
          } else {
            const id = 'SUC-0' + (DB.sucursales.length + 1);
            DB.sucursales.push({ ...data, id: id });
          }
          result = { success: true };
        } else if (action === 'savePaymentMethod') {
          const id = 'MP-0' + (DB.metodosPago.length + 1);
          DB.metodosPago.push({ ...data, id: id });
          result = { success: true, id: id };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Servir Index.html
  const filePath = path.join(__dirname, 'src', 'Index.html');
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Error leyendo Index.html: ' + err.message);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 DeliveryPro - Servidor de Pruebas Activo`);
  console.log(`🌐 Acceso Web: http://localhost:${PORT}`);
  console.log(`📱 Compatible con Desktop y Navegadores Móviles`);
  console.log(`======================================================\n`);
});
