# 🛵 DeliveryPro - Sistema de Gestión de Entregas a Domicilio para Negocios

> **Sistema profesional de despacho, rastreo GPS en mapa en vivo, finanzas y portal para repartidores desarrollado para Google Apps Script (HTML5 + Google Sheets como Base de Datos).**

100% Funcional tanto en **Computadoras (Web Desktop)** como en **Dispositivos Móviles (Smartphones Android / iOS)**.

---

## 🌟 Características Principales

| Requisito | Funcionalidad Implementada |
| :--- | :--- |
| ✅ **Asignar y dar seguimiento a pedidos** | Pipeline de estados en tiempo real (`PENDIENTE`, `ASIGNADO`, `EN_RUTA`, `ENTREGADO`, `CANCELADO`), vista de tarjetas o tabla, asignación rápida de repartidores y botón directo de WhatsApp para contactar al cliente. |
| ✅ **Ubicación de deliveries en el mapa** | Mapa interactivo con Leaflet y OpenStreetMap (sin APIs de pago). Visualización de pines en vivo para sucursales 🏬, repartidores en movimiento 🛵 y destinos de pedidos 📍. |
| ✅ **Balances, ingresos e historial** | Control de facturación neta, costos de envío recaudados, comisiones acumuladas por repartidor y control de **efectivo en mano** a rendir en caja con módulo de liquidación. |
| ✅ **Dashboard de rendimiento de negocio** | KPIs en vivo (total pedidos, tasa de entrega %, tiempo promedio de entrega, ventas totales), gráficos con Chart.js (estados, métodos de pago, ventas por sede) y ranking de repartidores. |
| ✅ **Sucursales y métodos de pago** | CRUD de sucursales (dirección, coordenadas, cobertura en km, encargado) y métodos de pago (efectivo, tarjetas POS, billeteras digitales Yape/Nequi/Plin/MercadoPago). |
| ✅ **Panel propio para cada repartidor** | Vista móvil optimizada para celulares: botón de transmisión GPS continua, navegación 1-clic en Google Maps/Waze, botón de llamada y WhatsApp, control de billetera y comisiones. |
| ✅ **Móvil y Web Responsive** | Diseño adaptativo con Tailwind CSS: barra de navegación inferior tipo App para celulares y dashboard multi-columna para pantallas grandes. |

---

## 🏗️ Arquitectura del Sistema

```
                    ┌───────────────────────────────────────────────┐
                    │          INTERFAZ DE USUARIO (SPA)            │
                    │   Tailwind CSS • Leaflet Maps • Chart.js      │
                    └──────────────────────┬────────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
             🏢 Modo Administrador                  🛵 Modo Repartidor
           - Despacho y Asignación                 - Mis Pedidos Activos
           - Mapa en Vivo GPS                      - Transmisión GPS
           - Dashboard & KPIs                      - Ruta Google Maps / Waze
           - Finanzas & Liquidación                - Billetera / Balance
                        │                                     │
                        └──────────────────┬──────────────────┘
                                           │  google.script.run / REST API
                                           ▼
                    ┌───────────────────────────────────────────────┐
                    │          GOOGLE APPS SCRIPT (V8)              │
                    │  - Code.gs (Router doGet/doPost)              │
                    │  - Orders.gs (Gestión de Pedidos)             │
                    │  - Drivers.gs (Repartidores & GPS)            │
                    │  - Branches.gs (Sucursales & Pagos)           │
                    │  - Analytics.gs (Dashboard & Balances)        │
                    │  - Database.gs (Motor CRUD)                   │
                    └──────────────────────┬────────────────────────┘
                                           │
                                           ▼
                    ┌───────────────────────────────────────────────┐
                    │              GOOGLE SHEETS                    │
                    │  - PEDIDOS               - REPARTIDORES       │
                    │  - SUCURSALES            - METODOS_PAGO       │
                    │  - TRANSACCIONES_BALANCE - CONFIGURACION      │
                    └───────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
├── google-apps-script/
│   ├── CodigoCompletoUnificado.gs # Todo el backend en 1 solo archivo (Opción rápida)
│   ├── Code.gs                    # Controlador principal y endpoints API
│   ├── Database.gs                # Conexión, schemas y operaciones con Google Sheets
│   ├── Orders.gs                  # Lógica de pedidos, cálculo y estados
│   ├── Drivers.gs                 # Gestión de repartidores, GPS y balances
│   ├── Branches.gs                # Sucursales y métodos de pago
│   ├── Analytics.gs               # Cálculo de métricas y gráficos
│   ├── Index.html                 # Aplicación Web & Móvil completa
│   └── appsscript.json            # Manifiesto de Google Apps Script
├── src/                           # Código fuente JS/HTML modular
├── test/
│   └── test-system.js             # Pruebas unitarias de cálculo y lógica
├── dev-server.js                  # Servidor de prueba local en Node.js (cero dependencias)
├── GUIA_INSTALACION.md            # Paso a paso detallado para desplegar en 3 minutos
└── README.md                      # Documentación general
```

---

## ⚡ Instalación en 3 Minutos en Google Apps Script

1. **Crea un nuevo proyecto** en [Google Apps Script](https://script.google.com).
2. **Copia el Backend**: Copia el contenido de [`google-apps-script/CodigoCompletoUnificado.gs`](./google-apps-script/CodigoCompletoUnificado.gs) dentro de `Código.gs`.
3. **Copia la Interfaz**: Crea un archivo HTML llamado `Index` y pega el contenido de [`google-apps-script/Index.html`](./google-apps-script/Index.html).
4. **Crea la Base de Datos**: Selecciona y ejecuta la función `inicializarBaseDeDatos`. Se creará automáticamente un Google Sheet con datos de demostración en tu Drive.
5. **Implementa**: Haz clic en **Implementar > Nueva implementación > Aplicación web > Acceso: Cualquier usuario**.

👉 Para ver instrucciones paso a paso detalladas con capturas, consulta la [Guía de Instalación](./GUIA_INSTALACION.md).

---

## 💻 Pruebas Locales Inmediatas

Puedes correr y probar el sistema localmente en tu computadora sin configurar nada previo:

```bash
# Iniciar servidor de desarrollo local
node dev-server.js

# Ejecutar pruebas unitarias
node test/test-system.js
```

Abre en tu navegador: **`http://localhost:3000`**

---

## 🛵 Uso del Portal para Repartidores

Los repartidores disponen de una interfaz adaptada a pantallas táctiles:

- **Inicio de sesión**: Seleccionando su nombre o mediante PIN rápido.
- **Transmisión de Coordenadas GPS**: Botón para activar/pausar el rastreo satelital desde el navegador del celular.
- **Navegación Asistida**: Con un solo toque abre la ruta en **Google Maps** o **Waze**.
- **Cobro de Pedido**: Indica claramente si el pedido está pagado electrónicamente o si debe cobrar efectivo.
- **Billetera de Ganancias**: Visualización en tiempo real de su acumulado de comisiones y del dinero en efectivo que debe rendir a la sucursal.

---

## 📊 Base de Datos en Google Sheets

El sistema gestiona de forma autónoma las siguientes hojas en tu Spreadsheet:

1. **`PEDIDOS`**: Historial detallado de órdenes, clientes, direcciones, coordenadas, repartidores asignados y tiempos de entrega.
2. **`REPARTIDORES`**: Registro de conductores, tipo de vehículo, placas, estado (`ACTIVO`, `EN_RUTA`, `DESCONECTADO`), balance de comisiones y efectivo recaudado.
3. **`SUCURSALES`**: Sedes del negocio con ubicación geográfica (lat/lng) y radio de entrega.
4. **`METODOS_PAGO`**: Tipos de pago habilitados e instrucciones de cobro.
5. **`TRANSACCIONES_BALANCE`**: Libro mayor con registro de comisiones ganadas, efectivo recaudado y liquidaciones de caja.
6. **`CONFIGURACION`**: Parámetros globales (nombre del negocio, moneda, porcentajes de comisión, coordenadas de inicio del mapa).

---

## 📄 Licencia

Este proyecto es de código abierto bajo la licencia MIT.
