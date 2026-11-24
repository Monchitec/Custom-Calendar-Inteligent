---
name: ui-design-system
description: >-
  Sistema de diseño UI y arquitectura de tokens cromáticos dinámicos para el
  Calendario Personal Inteligente (inspirado en Dragon Touch 21.5" Digital
  Calendar & Chore Chart). Define paletas temáticas intercambiables por el
  usuario (Rosado Armónico por defecto + Salvia, Océano, Lavanda, Atardecer y
  Minimal), tokens de categorías, botones, tarjetas, cuadrícula de calendario,
  checklists, pagos, alarmas y modos claro/oscuro. Usar siempre que se creen o
  modifiquen vistas o componentes visuales.
---

# Sistema de Diseño UI — Calendario Personal Inteligente

Este documento define la identidad visual, la arquitectura de **tokens semánticos globales** (`app/globals.css`), las **paletas temáticas seleccionables por el usuario** y los estándares de componentes del calendario.

> **Regla crítica**: El usuario puede cambiar de temática y de modo claro/oscuro en cualquier momento. **Nunca** se deben usar colores quemados de Tailwind (`bg-pink-*`, `bg-blue-*`, `text-slate-*`, etc.) en componentes. Todo debe consumir tokens semánticos.

---

## 1. Principios visuales (Referencia: Dragon Touch 21.5" Digital Calendar)

1. **Legibilidad de un vistazo (*Glanceable*)**: jerarquía clara de fecha, hora actual, eventos del día y pendientes sin ruido visual.
2. **Estética táctil y cálida**: tarjetas con bordes suaves (`rounded-2xl` / `rounded-3xl`), sombras sutiles, áreas táctiles amplias (`min-h-11` / `44px`) y separación limpia entre días y bloques.
3. **Codificación por color armoniosa**: cada módulo (Pagos, Trabajo, Tareas, Citas, Actividades, Pendientes, Alarmas) tiene un color distinguible que armoniza con la temática elegida por el usuario.
4. **Números alineados**: aplicar siempre `tabular-nums` en relojes, fechas de cuadrícula, montos de pagos recurrentes y contadores de alarmas.

---

## 2. Arquitectura de Temas Dinámicos (`app/globals.css`)

El tema se controla mediante atributos en el elemento raíz `<html>`:
- `data-theme="rose" | "sage" | "ocean" | "lavender" | "sunset" | "minimal"`
- `data-mode="light" | "dark"`

En Tailwind CSS v4 (`app/globals.css`), los tokens CSS se exponen mediante `@theme inline` para poder usarse directamente como utilidades (`bg-background`, `bg-card`, `text-foreground`, `bg-primary`, `bg-primary-soft`, `border-border`, `bg-cat-bills`, etc.).

### 2.1 Tokens semánticos obligatorios

| Grupo | Variable CSS | Utilidad Tailwind | Uso |
| :--- | :--- | :--- | :--- |
| **Lienzo** | `--background` | `bg-background` | Fondo general de la aplicación |
| **Superficie** | `--surface` | `bg-surface` | Sidebar, encabezado y paneles laterales |
| **Tarjetas** | `--card` | `bg-card` | Celdas del calendario, tarjetas y modales |
| **Tarjetas hover** | `--card-hover` | `bg-card-hover` | Estado hover de celdas y tarjetas |
| **Texto principal** | `--foreground` | `text-foreground` | Títulos, horas, texto principal |
| **Texto secundario** | `--muted-foreground` | `text-muted-foreground` | Subtítulos, días fuera de mes, metadatos |
| **Fondo suave** | `--muted` | `bg-muted` | Chips neutros, fondos de inputs, barras inactivas |
| **Bordes** | `--border` | `border-border` | Separadores de cuadrícula y bordes de tarjetas |
| **Primario** | `--primary` | `bg-primary`, `text-primary` | CTA principal, indicador de "Hoy", elemento activo |
| **Texto sobre primario** | `--primary-foreground` | `text-primary-foreground` | Texto/icono dentro de botones primarios |
| **Primario hover** | `--primary-hover` | `hover:bg-primary-hover` | Hover de acción principal |
| **Primario suave** | `--primary-soft` | `bg-primary-soft` | Fondos tenues de selección y día actual |
| **Secundario** | `--secondary` | `bg-secondary`, `text-secondary` | Acento complementario de la temática |
| **Texto secundario CTA** | `--secondary-foreground` | `text-secondary-foreground` | Texto sobre acento secundario |
| **Acento terciario** | `--accent` | `bg-accent`, `text-accent` | Resaltes suaves, rachas y badges destacados |
| **Éxito** | `--success` | `bg-success`, `text-success` | Pago realizado, checklist completado |
| **Advertencia** | `--warning` | `bg-warning`, `text-warning` | Pago próximo a vencer, alarma pospuesta |
| **Peligro** | `--danger` | `bg-danger`, `text-danger` | Pago vencido, eliminar, alerta crítica |

---

## 3. Paletas Temáticas Oficiales

### 3.1 Tema por defecto: **Rosado Armónico (`data-theme="rose"`)**
Pensado como paleta principal personalizable con tonos rosados elegantes y colores complementarios suaves (salvia/menta y durazno cálido) que evitan fatiga visual.

| Token | Modo Claro (`light`) | Modo Oscuro (`dark`) | Rol |
| :--- | :--- | :--- | :--- |
| `--background` | `#FFF8FA` | `#161014` | Lienzo rosado porcelana / ciruela profundo |
| `--surface` | `#FDF0F5` | `#1F161C` | Sidebar y cabecera |
| `--card` | `#FFFFFF` | `#281D24` | Tarjetas y cuadrícula |
| `--card-hover` | `#FFF2F7` | `#32242D` | Hover sutil |
| `--foreground` | `#2B1822` | `#FAF0F4` | Texto de alto contraste |
| `--muted` | `#F8E7EE` | `#34262F` | Fondos secundarios |
| `--muted-foreground` | `#7A5A6B` | `#C4A5B5` | Metadatos y etiquetas |
| `--border` | `#F0D5E1` | `#43313C` | Líneas suaves de cuadrícula |
| `--primary` | `#D94680` | `#F472B6` | Rosa frambuesa elegante |
| `--primary-hover` | `#C0346D` | `#EC4899` | Hover primario |
| `--primary-foreground` | `#FFFFFF` | `#240D19` | Contraste WCAG AA+ |
| `--primary-soft` | `#FCE7F1` | `#451C31` | Resalte del día de hoy / activo |
| `--secondary` | `#2F9E84` | `#5EEAD4` | Complementario salvia/menta |
| `--accent` | `#F28C6B` | `#FDBA74` | Complementario durazno cálido |
| `--success` | `#1F9D6B` | `#34D399` | Completado / Pagado |
| `--warning` | `#D9822B` | `#FBBF24` | Próximo a vencer |
| `--danger` | `#D93848` | `#FB7185` | Vencido / Eliminar |

### 3.2 Otras temáticas incluidas (mismos tokens, cambio instantáneo)

| Preset (`data-theme`) | Nombre visible | Primario (Claro / Oscuro) | Complementarios | Personalidad |
| :--- | :--- | :--- | :--- | :--- |
| `rose` *(Default)* | **Rosado Armónico** | `#D94680` / `#F472B6` | Salvia (`#2F9E84`), Durazno (`#F28C6B`) | Cálido, expresivo y sereno |
| `sage` | **Salvia Botánica** | `#3D8B6E` / `#52B788` | Terracota (`#D97757`), Arena (`#C9A25B`) | Natural, orgánico y relajado |
| `ocean` | **Océano Sereno** | `#2563EB` / `#60A5FA` | Coral (`#F06A6A`), Turquesa (`#14B8A6`) | Fresco, nítido y enfocado |
| `lavender` | **Lavanda Suave** | `#7C5CFA` / `#A78BFA` | Menta (`#2FB390`), Miel (`#E6A23C`) | Creativo, suave y moderno |
| `sunset` | **Atardecer Cálido** | `#D96B38` / `#FB923C` | Petróleo (`#2A8C96`), Rosa cálido (`#E05A7A`) | Energético y acogedor |
| `minimal` | **Grafito Minimal** | `#334155` / `#E2E8F0` | Índigo suave (`#6366F1`), Esmeralda (`#10B981`) | Sobrio y neutro |

> **Personalización avanzada**: El sistema debe permitir en el futuro sobrescribir `--primary`, `--secondary` y `--accent` desde `/configuracion` mediante CSS custom properties en línea sobre `document.documentElement`, manteniendo el contraste automático de `--primary-foreground`.

---

## 4. Tokens de Categorías Personalizables del Calendario

Como el usuario puede crear y renombrar sus propias categorías desde `/configuracion` (por ejemplo: *Trabajo*, *Colegio de Azucena*, *Citas*, *Actividades*, *Casa / Hogar*), el sistema provee **slots de color semánticos** (`--cat-<slot>` para acento/borde/texto y `--cat-<slot>-soft` para fondo de pastilla) que siempre armonizan con la temática activa y con ambos modos (claro/oscuro):

| Token base | Token fondo suave | Uso sugerido por defecto (editable por el usuario) |
| :--- | :--- | :--- |
| `--cat-bills` | `--cat-bills-soft` | **Pagos recurrentes del hogar** (reservado para el módulo `/pagos`) |
| `--cat-1` | `--cat-1-soft` | **Trabajo** (reuniones, turnos, entregas) |
| `--cat-2` | `--cat-2-soft` | **Colegio / Familia** (ej. *Colegio de Azucena*) |
| `--cat-3` | `--cat-3-soft` | **Citas** (médico, trámites, reuniones personales) |
| `--cat-4` | `--cat-4-soft` | **Actividades** (deporte, hobbies, salidas) |
| `--cat-5` | `--cat-5-soft` | **Casa / Hogar** (mantenimiento, compras) |
| `--cat-6` | `--cat-6-soft` | **Tareas / Pendientes** (checklists y pendientes rápidos) |
| `--cat-7` | `--cat-7-soft` | **Personal / Extra** (slot libre para nuevas categorías del usuario) |

> Cada categoría guarda únicamente su clave de token (ej. `"cat-2"`), nunca un código hexadecimal fijo, de modo que al cambiar de temática o modo claro/oscuro toda la cuadrícula se adapta con contraste garantizado.

---

## 5. Estándares de Componentes

### 5.1 Botones (`components/shared/ui/Button.tsx`)
- **Primario (CTA / Guardar / +Nuevo)**:
  `bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl px-4 py-2.5 shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`
- **Secundario**:
  `bg-muted hover:bg-card-hover text-foreground border border-border font-medium rounded-xl px-4 py-2.5 transition-all active:scale-[0.98]`
- **Ghost / Acción ligera**:
  `bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl px-3 py-2 transition-colors`
- **Peligro / Eliminar**:
  `bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 font-semibold rounded-xl px-4 py-2.5 transition-all`
- **Estados obligatorios**:
  - `disabled:opacity-45 disabled:pointer-events-none`
  - Estado `loading` manteniendo el ancho del botón con indicador animado accesible.

### 5.2 Navegación lateral (Estilo Dragon Touch Rail)
- Contenedor: `bg-surface border-r border-border`
- Elemento inactivo: `text-muted-foreground hover:bg-muted hover:text-foreground rounded-2xl px-3.5 py-2.5 transition-colors`
- Elemento activo: `bg-primary-soft text-primary font-semibold border border-primary/25 rounded-2xl px-3.5 py-2.5`
- Indicador de notificaciones/alarmas activas: badge circular `bg-primary text-primary-foreground text-[11px] font-bold tabular-nums`.

### 5.3 Cuadrícula de Calendario y Pastillas de Evento
- **Celda de día**: `bg-card hover:bg-card-hover border border-border rounded-2xl p-2.5 transition-colors`
- **Día actual ("Hoy")**: `bg-primary-soft/60 border-primary/50 ring-1 ring-primary/30` con el número del día dentro de un círculo `bg-primary text-primary-foreground font-bold tabular-nums`.
- **Pastilla de evento (`EventPill`)**: barra lateral de categoría + fondo suave + texto legible:
  `flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium border-l-3 truncate` usando las variables de su categoría (`--cat-*` y `--cat-*-soft`).

### 5.4 Tarjetas de Pagos Recurrentes, Checklists y Alarmas
- **Tarjeta base**: `bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:border-primary/30 transition-colors`
- **Pagos recurrentes**: monto en `text-lg font-bold tabular-nums text-foreground`, fecha de corte con badge semántico:
  - Pagado: `bg-success/15 text-success border border-success/30`
  - Próximo: `bg-warning/15 text-warning border border-warning/30`
  - Vencido: `bg-danger/15 text-danger border border-danger/30`
- **Checklists / Chore Chart**: casillas grandes (`h-6 w-6 rounded-lg`) fáciles de pulsar, barra de progreso con `bg-muted` y relleno `bg-primary` o `bg-success` al 100%, ítems completados con `line-through text-muted-foreground`.
- **Alarmas**: hora destacada en `text-2xl font-bold tabular-nums` + switch accesible con estado activo en `bg-primary`.

### 5.5 Formularios e Inputs
- **Inputs / Selects / Textarea**:
  `w-full rounded-xl bg-card border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all`
- **Labels**: `block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5`
- **Errores**: `mt-1 text-xs font-medium text-danger`

---

## 6. Reglas de Contraste y Modos Claro/Oscuro

1. Todo texto sobre `--background`, `--surface` y `--card` debe cumplir contraste mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto grande e iconos interactivos).
2. Nunca usar `text-white` o `text-black` directamente en componentes; usar `text-foreground`, `text-primary-foreground` o `text-secondary-foreground`.
3. Toda nueva vista debe probarse en **modo claro y modo oscuro** y al menos en **Rosado Armónico (`rose`)** y una segunda temática (ej. `sage` u `ocean`).
