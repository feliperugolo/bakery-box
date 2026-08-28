# Bakery Box — Tienda online

Sitio de e-commerce para Bakery Box by Lunch Box: catálogo de tortas y
postres, carrito de compras, checkout con WhatsApp (transferencia o
efectivo, retiro o delivery) y panel de administrador para cargar
productos, precios, promos, categorías y ver los pedidos.

Hecho con **Next.js 16** + **Tailwind CSS** + **Supabase** (base de datos,
login del admin y almacenamiento de fotos).

> **Ya está todo conectado.** Creé el proyecto de Supabase de esta tienda,
> cargué las tablas, las políticas de seguridad, el bucket de fotos y los
> 7 productos de muestra, y dejé el archivo `.env.local` de este proyecto
> con las claves ya cargadas. No hace falta que hagas los pasos 1 y 2 de
> más abajo — quedan documentados solo por si en algún momento necesitás
> recrear el proyecto o conectar otro. Los dos pasos que sí te quedan a
> vos son crear tu usuario de acceso a `/admin` (2 minutos) y el deploy en
> Netlify — ambos explicados abajo.

**Datos de tu proyecto de Supabase** (org "Acadmeals's Org", proyecto
`bakery-box`, región São Paulo):
- Project URL: `https://xefbbsjxpehhywbumyrt.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/xefbbsjxpehhywbumyrt

### Creá tu usuario de administrador (el único paso pendiente en Supabase)

Elegí vos el email y la contraseña — no las inventé yo por seguridad:

1. Entrá a https://supabase.com/dashboard/project/xefbbsjxpehhywbumyrt/auth/users
2. **Add user → Create new user**.
3. Cargá tu email y una contraseña. Con eso entrás a `/admin` en el sitio.

---

## 1. Crear el proyecto de Supabase (gratis) — no necesario, ya está hecho

Referencia para el futuro (por ejemplo si algún día necesitás otro
proyecto desde cero):

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta (podés
   usar tu cuenta de Google/GitHub).
2. Creá un **New Project**. Elegí una contraseña para la base de datos y
   guardala (no la vas a necesitar de nuevo, pero por las dudas).
3. Esperá 1-2 minutos a que el proyecto termine de crearse.
4. Andá a **SQL Editor** (ícono en la barra lateral) → **New query**.
5. Abrí el archivo [`supabase/schema.sql`](./supabase/schema.sql) de este
   proyecto, copiá TODO el contenido, pegalo en el editor de Supabase y
   apretá **Run**. Esto crea las tablas, las políticas de seguridad, el
   bucket de fotos y carga algunos productos de ejemplo.
6. Andá a **Authentication → Users → Add user → Create new user**. Ese
   email y contraseña van a ser tu usuario y contraseña para entrar a
   `/admin`.
7. Andá a **Project Settings → API**. Ahí vas a ver el **Project URL** y
   la **anon public key** que necesitás para el paso siguiente.

## 2. Variables de entorno — ya cargadas en `.env.local`

Ese archivo ya está en este proyecto con tus datos reales:

```
NEXT_PUBLIC_SUPABASE_URL=https://xefbbsjxpehhywbumyrt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_r3WdUsthPH7Qp_uSLTVyFQ__M6Qsfk5
NEXT_PUBLIC_WHATSAPP_NUMBER=5491162797363
```

`.env.local` nunca se sube a git (está en `.gitignore`) — cuando lo subas
a GitHub para Netlify, estas variables no van a viajar con el código; las
vas a cargar de nuevo a mano en Netlify en el paso 4 (es un copy/paste,
un minuto).

## 3. Ver el sitio en tu computadora antes de publicarlo

Este proyecto **no es un `index.html` que se abre haciendo doble click**:
es una aplicación Next.js, necesita un servidor corriendo (aunque sea en tu
propia compu) para poder verse. Los pasos:

1. Instalá [Node.js](https://nodejs.org) (versión 20.9 o más nueva) si no
   lo tenés. Para saber si ya lo tenés, abrí una terminal y escribí
   `node -v`.
2. Descomprimí este proyecto y abrí una terminal **en esa carpeta**.
3. Corré:

   ```bash
   npm install
   npm run dev
   ```

4. Abrí [http://localhost:3000](http://localhost:3000) en el navegador —
   ahí vas a ver la tienda ya conectada a tu base de Supabase real (los 7
   productos que ves son datos reales, no la demo). Cada vez que quieras
   volver a verla, repetí `npm run dev` desde la carpeta del proyecto y
   dejá esa terminal abierta mientras la mirás.
5. `/admin` también funciona en local con el usuario que creás en el paso
   de "Creá tu usuario de administrador" de más arriba.

No hace falta hacer esto para publicar el sitio — es solo para verlo antes.

## 4. Publicar en Netlify (lo hacés vos)

1. Subí este proyecto a un repositorio de GitHub (o GitLab/Bitbucket) —
   Netlify despliega conectado a un repo, no subiendo el zip directamente.
   El `.gitignore` ya excluye `.env.local`, así que tus claves no se suben
   al repo por accidente.
2. Entrá a [app.netlify.com](https://app.netlify.com), **Add new site →
   Import an existing project**, y elegí ese repositorio.
3. Netlify detecta automáticamente que es un proyecto Next.js y configura
   el build solo (usa su adaptador oficial para Next.js). No hace falta
   tocar el comando de build ni el directorio de salida.
4. Antes de darle a **Deploy**, andá a **Site settings → Environment
   variables** (o te lo pide en el mismo paso de importación) y cargá las
   mismas tres variables del paso 2:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_WHATSAPP_NUMBER`.
5. Deploy. En un par de minutos tenés tu sitio en una URL de Netlify
   (`tu-sitio.netlify.app`), y después podés conectar tu dominio propio
   desde **Domain settings**.

> ¿Preferís Vercel? Funciona exactamente igual: importás el repo, cargás
> las mismas variables de entorno y hacés Deploy — Vercel también detecta
> Next.js automáticamente.

## Cómo usar el panel de administrador (`/admin`)

- **Productos**: crear, editar, subir fotos (arrastrás para reordenarlas
  y la primera queda como foto principal), poner precio y precio de
  oferta, elegir categoría, activar/desactivar, marcar como destacado, y
  arrastrar en la lista para cambiar el orden en que aparecen en la
  tienda.
- **Categorías**: crear, renombrar, reordenar, activar/desactivar.
- **Pedidos**: los pedidos que los clientes mandan desde el carrito
  también quedan guardados acá (además de llegar por WhatsApp), con
  estado (nuevo / confirmado / entregado / cancelado).
- **Configuración**: nombre de la tienda, número de WhatsApp, Instagram,
  dirección de retiro, nota de delivery, y los datos de transferencia
  (alias, CBU, titular) que ven los clientes al elegir "Transferencia"
  en el checkout.

## Cómo funciona el checkout

El cliente arma su pedido, completa nombre, teléfono, elige retiro o
delivery (con dirección) y transferencia o efectivo. Al confirmar, el
pedido se guarda en Supabase (para que lo veas en `/admin/pedidos`) y se
abre WhatsApp con el mensaje del pedido ya armado, listo para mandarte al
número configurado.

## Estructura del proyecto

```
src/
  app/
    (site)/          → tienda pública (home, catálogo, producto, carrito)
    admin/            → panel de administrador (protegido con login)
  components/         → componentes de UI reutilizables
  lib/                → conexión a Supabase, tipos, carrito, WhatsApp
supabase/
  schema.sql          → todo el esquema de base de datos + datos de ejemplo
public/images/         → logo, banners y fotos de productos
```

## Comandos

```bash
npm run dev     # servidor de desarrollo
npm run build   # build de producción
npm run start   # correr el build de producción en local
npm run lint    # revisar el código
```
