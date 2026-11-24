---
name: app-architecture
description: >-
  Guía de arquitectura para el Calendario Personal Inteligente (inspirado en
  Dragon Touch 21.5" Digital Calendar & Chore Chart) con Next.js App Router,
  React, TypeScript y Tailwind CSS v4. Define el esqueleto del proyecto con
  sidebar izquierdo de 4 secciones (Calendario, Tareas y Checklists, Pagos,
  Configuración con Temas, Categorías personalizables y Alarmas/Notificaciones),
  sistema de temas dinámicos y verificación segura de cambios.
---

# Arquitectura del Proyecto — Calendario Personal Inteligente

## 1. Visión y principios

Este proyecto es un **Calendario Personal y Centro de Organización del Hogar y Trabajo**, inspirado en la claridad visual e inmediatez táctil de un **Dragon Touch 21.5" Digital Calendar & Chore Chart**, pero completamente personalizable en temáticas de color, categorías y flujos personales.

### Separación clave: Módulos (Sidebar) vs. Categorías personalizables
Para mantener la aplicación intuitiva y sin fragmentación:
- **Sidebar izquierdo (4 secciones principales)**: agrupa únicamente las vistas con una interfaz propia:
  1. **Calendario (`/`)**: vistas Mes, Semana, Día y Agenda con reloj/fecha en vivo, filtros rápidos por categoría y botón `+ Nuevo`. Proyecta en un solo lugar eventos, citas, actividades, trabajo, colegio, vencimientos de pagos y tareas con fecha.
  2. **Tareas y Checklists (`/tareas`)**: tablero estilo *Chore Chart* con dos bloques: **Pendientes** (tareas puntuales con o sin fecha) y **Checklists / Rutinas** (listas con pasos marcables, barra de progreso y reinicio diario o semanal).
  3. **Pagos (`/pagos`)**: gestión dedicada de pagos recurrentes del hogar (renta, servicios, suscripciones) con montos (`tabular-nums`), frecuencias, resumen mensual, estado (*Pagado / Próximo / Vencido*) y proyección automática al calendario.
  4. **Configuración (`/configuracion`)**: organizada en 3 pestañas:
     - **Apariencia y Temas**: modo Claro / Oscuro, paletas temáticas (Rosado Armónico por defecto + Salvia, Océano, Lavanda, Atardecer, Minimal) y densidad visual.
     - **Categorías**: crear, renombrar, elegir ícono y color armónico para áreas/personas personalizadas (ej. *Trabajo*, *Colegio de Azucena*, *Citas*, *Actividades*, *Casa / Hogar*).
     - **Alarmas y Notificaciones**: gestionar alarmas programadas (hora, días de repetición, etiqueta, activar/desactivar), elegir y probar sonidos de alarma, configurar anticipación de recordatorios (ej. 15 min antes para citas, 2 días antes para pagos) y permisos de notificación del navegador.
- **Barra superior (`TopHeader`)**: reloj y fecha en vivo, selector de vista (en `/`), botón rápido `+ Nuevo` y **campana de notificaciones** (popover con alertas activas, próximos recordatorios y alarmas del día sin salir de la pantalla actual).

### Principios de arquitectura
1. **Las rutas viven en `app/`.** Este repositorio usa el App Router en la raíz (`app/`, no `src/app/`) con alias `@/*` apuntando a `./*`.
2. **Los componentes viven en `components/`, agrupados por módulo funcional.**
3. **Los componentes compartidos viven en `components/shared/`.** Solo sube un componente allí cuando se reutilice en múltiples módulos o sea una primitiva UI global.
4. **Separación clara de responsabilidades.**
   - `app/` coordina rutas, layouts y metadata.
   - `components/` presenta la UI y estados interactivos locales.
   - `lib/` contiene lógica pura de fechas, recurrencias, persistencia, cálculos de pagos, sonidos y utilidades de temas.
   - `types/` centraliza los contratos TypeScript del dominio.
   - `hooks/` encapsula estado reutilizable de cliente (reloj en vivo, tema activo, motor de alarmas/notificaciones).
5. **Temas 100% guiados por tokens globales.** Ningún componente define colores fijos; todo responde a los tokens semánticos definidos en `app/globals.css` y regulados por `.agents/rules/ui-tokens.md`.
6. **Simplicidad incremental.** Crea carpetas y archivos conforme se implemente cada módulo; no generes abstracciones vacías por adelantado.

---

## 2. Esqueleto del proyecto (Estructura objetivo)

```text
Calendario/
├── app/                                # Rutas y layouts (Next.js App Router)
│   ├── globals.css                     # Tokens semánticos, temas dinámicos y Tailwind v4 (@theme)
│   ├── layout.tsx                      # Layout raíz, fuentes, Providers y AppShell (Sidebar izquierdo)
│   ├── page.tsx                        # Vista principal: Calendario unificado (Mes/Semana/Día/Agenda)
│   ├── tareas/
│   │   └── page.tsx                    # Tareas, pendientes y checklists (estilo Chore Chart)
│   ├── pagos/
│   │   └── page.tsx                    # Pagos recurrentes del hogar y resumen mensual
│   └── configuracion/
│       └── page.tsx                    # Temas, Claro/Oscuro, Categorías personalizables y Alarmas/Notificaciones
│
├── components/
│   ├── shared/                         # UI y estructura reutilizable globalmente
│   │   ├── layout/                     # AppShell, SidebarRail (izquierdo), TopHeader, NotificationPopover
│   │   ├── providers/                  # ThemeProvider, CalendarDataProvider, AlarmNotificationProvider
│   │   └── ui/                         # Button, Card, Badge, Modal/Drawer, Input, Select, Switch, Tabs
│   ├── calendar/                       # Componentes del calendario principal (/)
│   │   ├── CalendarBoard.tsx           # Coordinador de vistas + barra de filtros por categoría
│   │   ├── MonthGrid.tsx               # Cuadrícula mensual tipo Dragon Touch
│   │   ├── WeekView.tsx                # Vista semanal por columnas y bloques horarios
│   │   ├── DayView.tsx                 # Vista diaria detallada + panel de pendientes del día
│   │   ├── AgendaView.tsx              # Lista cronológica de próximos eventos, citas y pagos
│   │   ├── EventPill.tsx               # Pastilla de evento coloreada según categoría personalizable
│   │   └── QuickAddModal.tsx           # Modal rápido para crear evento, cita, tarea, pago o alarma
│   ├── tasks/                          # Módulo de tareas y checklists (/tareas)
│   │   ├── ChoreChecklistBoard.tsx     # Tablero interactivo (Pendientes + Checklists/Rutinas)
│   │   ├── ChecklistGroupCard.tsx      # Grupo de checklist con barra de progreso y reinicio
│   │   └── PendingList.tsx             # Lista rápida de pendientes filtrables por categoría
│   ├── bills/                          # Módulo de pagos recurrentes (/pagos)
│   │   ├── BillsDashboard.tsx          # Resumen mensual (total, pagado, por pagar, vencido)
│   │   ├── BillCard.tsx                # Tarjeta de pago con monto tabular-nums y acción "Marcar pagado"
│   │   └── BillFormModal.tsx           # Formulario de pago con regla de recurrencia y recordatorio
│   └── settings/                       # Módulo de configuración (/configuracion)
│       ├── SettingsView.tsx            # Contenedor con pestañas (Apariencia, Categorías, Alarmas)
│       ├── ThemeSelector.tsx           # Selector de paletas temáticas + modo Claro/Oscuro
│       ├── CategoryCustomizer.tsx      # CRUD de categorías (Trabajo, Colegio de Azucena, Citas, etc.)
│       └── AlarmsSettingsPanel.tsx     # Alarmas programadas, selector/prueba de sonido y recordatorios
│
├── hooks/                              # Hooks de cliente reutilizables
│   ├── useTheme.ts                     # Lectura/cambio de tema y modo (sincronizado con HTML data-*)
│   ├── useClock.ts                     # Reloj en vivo para el encabezado tipo pantalla inteligente
│   └── useAlarms.ts                    # Evaluación de alarmas, reproducción de sonido y Notification API
│
├── lib/                                # Lógica de dominio y utilidades puras (sin JSX)
│   ├── dates.ts                        # Helpers de calendario (grillas, rangos, formato es-ES/local)
│   ├── recurrence.ts                   # Motor de recurrencia (diaria, semanal, quincenal, mensual, anual)
│   ├── themes.ts                       # Definición de presets de temas (Rosado, Salvia, Océano, etc.)
│   ├── defaultCategories.ts            # Categorías iniciales editables (Trabajo, Colegio, Citas, etc.)
│   ├── sounds.ts                       # Tonos de alarma generados/reproducibles en navegador
│   ├── storage.ts                      # Persistencia segura en cliente (localStorage)
│   └── cn.ts                           # Helper para combinar clases condicionales
│
└── types/                              # Contratos TypeScript compartidos
    ├── calendar.ts                     # CalendarEvent, CalendarView, Category, RecurrenceRule
    ├── tasks.ts                        # TaskItem, Checklist, ChecklistStep
    ├── bills.ts                        # RecurringBill, BillStatus
    ├── alarms.ts                       # AlarmItem, AlarmSoundId, NotificationItem, ReminderDefaults
    └── theme.ts                        # ThemePresetId, ColorMode, ThemeConfig
```

---

## 3. Modelo de datos unificado (Dominio)

Para que el calendario principal muestre **todo en un solo lugar** sin duplicar lógica:

- **Categorías personalizables (`Category`)**: cada categoría tiene `id`, `name` (ej. *"Trabajo"*, *"Colegio de Azucena"*, *"Citas"*, *"Actividades"*, *"Casa"*), `icon` y `colorToken` (referencia a uno de los slots de color semánticos `--cat-1` .. `--cat-7` definidos en `app/globals.css`, nunca un hex fijo en componentes).
- **Proyección unificada al calendario**:
  - Eventos/citas/actividades (`CalendarEvent`) llevan `categoryId`, fecha/hora, ubicación, notas y recordatorio opcional.
  - Pagos recurrentes (`RecurringBill`) se proyectan en sus fechas de vencimiento usando el token dedicado `--cat-bills`.
  - Tareas pendientes con fecha (`TaskItem`) se proyectan opcionalmente en su día asignado usando su `categoryId`.
- **Reglas de recurrencia (`RecurrenceRule`)**: compartidas entre pagos recurrentes, rutinas/checklists, eventos y alarmas (`none | daily | weekdays | weekly | biweekly | monthly | yearly`).

---

## 4. Responsabilidades de cada capa

### 4.1 `app/**/page.tsx`
- Mantener las páginas delgadas: definen `metadata` y renderizan el componente principal del módulo.
- Evitar lógica compleja de estado directamente en `page.tsx`.

### 4.2 Server Components vs Client Components
- Todos los componentes son **Server Components por defecto**.
- Agregar `"use client"` únicamente en componentes que requieran estado, eventos, timers (reloj/alarmas), `localStorage` o APIs del navegador (`Notification`, `AudioContext`).
- **Hidratación segura (SSR)**:
  - No leer `window`, `localStorage` ni `new Date()` dependiente de zona horaria de forma que cause mismatch en SSR.
  - Aplicar `data-theme` y `data-mode` de forma segura al montar / mediante script inicial para evitar parpadeo visual.

### 4.3 Separación de estilos
- Usar Tailwind CSS v4 con las utilidades generadas desde `@theme inline` en `app/globals.css`.
- Cuando un componente crezca en complejidad visual, extraer un archivo hermano `Componente.styles.ts` para agrupar clases repetidas.
- Nunca incrustar colores directos de Tailwind (`bg-pink-500`, `bg-blue-600`, etc.) en componentes; ver `.agents/rules/ui-tokens.md`.

---

## 5. Responsive y modo Pantalla Inteligente (Dragon Touch)

El layout se adapta a tres contextos:
1. **Pantalla grande / Wall Display (1280px – 21.5"+)**: sidebar izquierdo fijo tipo *rail* con íconos y etiquetas grandes, encabezado con reloj/fecha visible a distancia, cuadrícula amplia y panel rápido del día.
2. **Tablet (768px – 1279px)**: controles táctiles generosos (`min-h-11` / `44px`), sidebar compacto y modales cómodos para toque.
3. **Móvil (< 768px)**: barra de navegación inferior con las 4 secciones principales, vista por defecto de Día o Agenda y botón flotante `+`.

---

## 6. Accesibilidad y experiencia intuitiva

- HTML semántico (`aside`, `header`, `nav`, `main`, `section`, `article`).
- Navegación por teclado en calendario, modales, pestañas y checklists, con foco visible usando `ring-primary`.
- Botones de solo icono con `aria-label` descriptivo.
- Estados claros de **carga**, **vacío** (con CTA directo para crear el primer elemento) y **error**.

---

## 7. Verificación obligatoria antes de entregar cambios

Ejecutar siempre los scripts reales definidos en `package.json`:

```bash
pnpm lint
pnpm format:check
pnpm exec tsc --noEmit
pnpm build
```

Además:
- Verificar visualmente en al menos **dos temáticas de color** (incluyendo **Rosado Armónico**) y en **modo claro y oscuro**.
- Comprobar que ningún componente introduzca colores arbitrarios fuera de `app/globals.css`.
- No dejar código muerto, imports sin uso ni archivos obsoletos.
