Proyecto: Gestio - Sistema de Gestión de Ventas
1. Overview del Producto

    Problema que resuelve: Permite a freelancers y pequeños negocios gestionar de forma local sus ventas, clientes e inventario, con un enfoque especial en el seguimiento de pagos por cuotas (installments).

    Público objetivo: Freelancers, emprendedores y pequeños comercios que requieren una herramienta local y sencilla fuera de la nube.

    Propuesta de valor única: Gestión integral de ventas a cuotas con recordatorios automáticos (notificaciones) y un sistema de calendario para cobros, todo funcionando de forma offline y con backups sencillos.

    Métricas clave: Total de ingresos, volumen de ventas, cantidad de clientes activos y stock de productos.

2. Stack Tecnológico
Frontend

    Framework: Next.js 15.4.5 (React 18.2.0)

    Estilos: TailwindCSS (v3), PostCSS.

    Componentes UI: Radix UI (Shadcn/UI), Lucide React (iconos), Recharts (gráficos), Sonner (notificaciones).

    Formularios: React Hook Form + Zod.

Backend (Main Process)

    Entorno: Electron 32.3.3

    Lenguaje: TypeScript / Node.js.

Base de Datos

    Motor: SQLite vía better-sqlite3 (v12.2.0).

    ORM/Query Builder: Consultas directas SQL con un wrapper de operaciones en database-operations.ts.

Herramientas de Desarrollo

    Concurrently, Cross-env, Vitest (testing), Electron Builder.

3. Arquitectura y System Design

    Arquitectura general: Aplicación de escritorio monolítica basada en Electron. Utiliza el patrón de arquitectura local donde el Proceso Principal (Main Process) gestiona la base de datos y el Proceso de Renderizado (Next.js) se encarga de la UI.

    Comunicación: IPC (Inter-Process Communication) utilizando ipcRenderer.invoke e ipcMain.handle.

    Estructura de Carpetas:

        app/: Rutas y páginas de Next.js.

        electron/: Lógica del proceso principal y preload scripts.

        components/: UI dividida en ui (atómicos), sales, customers, products, etc.

        lib/: Operaciones de base de datos, utilidades y lógica centralizada.

        notifications/: Sistema modular de notificaciones y hooks de negocio.

4. Base de Datos y Modelos

La base de datos SQLite se inicializa y migra en lib/database.ts.

Entidad,Descripción
customers,"Datos de contacto, DNI, estado activo/archivado."
products,"Catálogo, precio, costo, stock y categorías."
sales,"Cabecera de venta, número de factura, totales, tipo de pago (contado/cuotas)."
installments,"Detalle de cuotas, fechas de vencimiento, saldos y multas."
sale_items,Productos vinculados a cada venta con cantidades y precios.
payment_transactions,Registro histórico de pagos realizados.
notifications,"Alertas de stock bajo, vencimientos y recordatorios."
calendar_events,Eventos manuales o automáticos vinculados a fechas.

5. Features Implementadas

    Dashboard: Métricas en tiempo real, gráficos de ingresos (Recharts) y accesos rápidos. ✅

    Gestión de Clientes: CRUD completo, búsqueda avanzada y archivado/anonimización. ✅

    Inventario: Control de productos, precios de costo/venta y stock. ✅

    Ventas: Generación de ventas al contado o cuotas, con cálculo automático de totales. ✅

    Seguimiento de Cuotas: Cobro de cuotas, reprogramación, aplicación de recargos y estado de deuda. ✅

    Notificaciones: Sistema de alertas para stock bajo y cobros pendientes. ⚠️ (En mejora continua)

    Calendario: Visualización de vencimientos y eventos de gestión. ✅

    Backup/Restore: Exportación e importación completa en formato JSON. ✅

6. APIs y Endpoints (IPC)

El puente entre Next.js y Electron se define en preload.js e implementa en main.ts.

    Customers: getAll, getPaginated, search, create, update, archive.

    Sales: create, getWithDetails, getStatsComparison, getTotalRevenue.

    Installments: markAsPaid, recordPayment, getUpcoming, getOverdue.

    Backup: save, load, importCustomers, importProducts, importSales.

7. Frontend - Componentes y Vistas

    Estado Global: Minimalista, utilizando hooks personalizados como useDataCache y Context para temas.

    Routing: App Router de Next.js.

    Componentes Clave:

        Sidebar y Header persistentes.

        SaleForm: Formulario complejo con manejo de estado dinámico para productos y cuotas.

        CustomerProfile: Vista detallada con historial de compras y deudas.

    Estilos: Sistema basado en Shadcn UI con soporte nativo para Dark Mode.

8. Autenticación y Seguridad

    Autenticación: No implementada (es una app local monousuario).

    Seguridad:

        contextIsolation: true y nodeIntegration: false en Electron.

        Validación de datos mediante Zod en formularios.

        Almacenamiento local seguro en el directorio de datos de usuario del sistema.

9. Features Futuras y Roadmap

    Mejoras en Reportes: Generación de PDFs de facturas más avanzados (vía jspdf).

    Optimización de Sincronización: Refactorización de la lógica de pagos parciales en cuotas.

    Dashboards Personalizados: Más widgets de analítica.

10. Deuda Técnica y Pain Points

    Duplicación de Lógica: El cálculo de gráficos y estadísticas se realiza tanto en SQL como en el frontend (dashboard page).

    Migraciones Manuales: La gestión de esquema se hace mediante bloques TRY/CATCH masivos en database.ts, lo que dificulta la escalabilidad comparado con ORMs como Prisma.

    Complejidad de IPC: Creciente cantidad de manejadores IPC que podrían modularizarse más.

11. Configuración y Deployment

    Scripts: * npm run electron-dev: Desarrollo con hot-reload.

        npm run electron-pack: Genera el instalador para Windows mediante Electron Builder.

    Entornos: Configuración vía .env.

12. Testing y Calidad

    Framework: Vitest.

    Tests Existentes: Enfocados en utilidades de fechas y lógica crítica de programación de cuotas (tests folder).

    Linting: ESLint configurado con reglas estándar de Next.js.



