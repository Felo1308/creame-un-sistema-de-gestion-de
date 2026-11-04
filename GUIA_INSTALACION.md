# 🚀 Guía de Instalación y Despliegue en Google Apps Script

Esta guía te explica cómo poner en marcha tu **Sistema de Gestión de Entregas a Domicilio (DeliveryPro)** en **menos de 3 minutos**, 100% gratis utilizando Google Apps Script y Google Sheets como base de datos.

---

## 📋 Pasos Rápidos de Instalación

### Paso 1: Crear el Proyecto en Google Apps Script
1. Entra a [script.google.com](https://script.google.com) e inicia sesión con tu cuenta de Google.
2. Haz clic en el botón superior izquierdo **"+ Nuevo proyecto"**.
3. Cambia el nombre del proyecto en la parte superior (por ejemplo: `DeliveryPro - Sistema de Entregas`).

---

### Paso 2: Copiar el Código del Backend (.gs)
Tienes dos opciones sencillas:

#### Opción A (La más rápida - 1 solo archivo):
1. Abre el archivo [`google-apps-script/CodigoCompletoUnificado.gs`](./google-apps-script/CodigoCompletoUnificado.gs).
2. Copia todo su contenido.
3. En el editor de Google Apps Script, borra el código que viene por defecto en `Código.gs` y pega todo el contenido copiado.
4. Presiona el botón del disquete 💾 (**Guardar**).

#### Opción B (Modular - archivos separados):
Crea los archivos con el botón `+` (secuencia de comandos) con los siguientes nombres y copia el contenido correspondiente desde la carpeta `google-apps-script/`:
- `Database.gs`
- `Orders.gs`
- `Drivers.gs`
- `Branches.gs`
- `Analytics.gs`
- `Code.gs`

---

### Paso 3: Crear el Archivo de Interfaz Web (Index.html)
1. En el editor de Google Apps Script, haz clic en el botón **`+`** al lado de "Archivos".
2. Selecciona **"HTML"**.
3. Nómbralo exactamente: **`Index`** (sin la extensión `.html`).
4. Abre el archivo [`google-apps-script/Index.html`](./google-apps-script/Index.html) de este repositorio, copia todo su contenido y pégalo en el archivo `Index.html` de Google Apps Script.
5. Haz clic en 💾 (**Guardar**).

---

### Paso 4: Inicialización Automática de la Base de Datos
El sistema creará automáticamente una hoja de cálculo en tu Google Drive con tablas preconfiguradas y datos de demostración:
1. En la barra superior del editor, busca el selector de funciones (donde dice `myFunction` o similar).
2. Selecciona la función: **`inicializarBaseDeDatos`**
3. Haz clic en **"Ejecutar"** (▶).
4. Google te pedirá autorizar permisos la primera vez:
   - Haz clic en *Revisar permisos*.
   - Elige tu cuenta.
   - Haz clic en *Avanzado* (o *Configuración avanzada*).
   - Haz clic en *Ir a DeliveryPro (no seguro)* y luego en *Permitir*.
5. Verás en el registro de ejecución: `Base de datos inicializada correctamente` junto al enlace del Google Sheet creado en tu Google Drive.

> 💡 **Nota:** Si deseas vincular una hoja de cálculo existente, copia el ID de tu Google Sheet y agrégalo en **Configuración del proyecto > Propiedades de la secuencia de comandos** con el nombre `SPREADSHEET_ID`.

---

### Paso 5: Implementar como Aplicación Web (Web App)
1. En la esquina superior derecha, haz clic en el botón azul **"Implementar"** > **"Nueva implementación"**.
2. En el engranaje ⚙️ (Seleccionar tipo), elige **"Aplicación web"**.
3. Configura las siguientes opciones:
   - **Descripción**: `Versión 1.0 - DeliveryPro`
   - **Ejecutar como**: `Yo (tu correo electrónico)`
   - **Quién tiene acceso**: `Cualquier usuario` *(o Cualquier persona con la cuenta de Google, según tu preferencia)*.
4. Haz clic en **"Implementar"**.
5. ¡Listo! Copia la **URL de la aplicación web** generada.

---

## 📱 ¿Cómo Acceden los Repartidores desde el Celular?

Cada repartidor puede abrir la misma URL en el navegador de su teléfono (Chrome, Safari, etc.):

1. Abre la URL en el celular.
2. Toca en el botón superior derecho **"Repartidor"**.
3. Selecciona su nombre e ingresa (o utiliza el enlace directo):
   ```
   https://script.google.com/macros/s/TU_ID_DE_DESPLIEGUE/exec?portal=driver
   ```
4. El repartidor podrá:
   - Activar su **GPS en vivo** para que el despachador lo vea en el mapa.
   - Ver sus pedidos asignados con dirección y teléfono.
   - Abrir la ruta en **Google Maps** o **Waze** con 1 solo toque.
   - Contactar al cliente directamente por **WhatsApp**.
   - Consultar sus ganancias por comisiones y el efectivo que lleva en mano.

---

## 💻 Pruebas Locales (Sin Internet / Sin Apps Script)

Si deseas probar la interfaz y todas las funciones en tu computadora:
```bash
node dev-server.js
```
Abre tu navegador en `http://localhost:3000`.
