-- ============================================================================
-- Bakery Box — esquema de base de datos para Supabase
-- ============================================================================
-- Cómo usarlo:
-- 1. Entrá a tu proyecto de Supabase -> SQL Editor -> New query
-- 2. Pegá TODO este archivo y ejecutalo (Run)
-- 3. Andá a Authentication -> Users -> Add user y creá tu usuario admin
--    (ese email/contraseña es con lo que vas a entrar a /admin)
-- ============================================================================

-- Extensión necesaria para generar UUIDs
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Categorías
-- ----------------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  image_url text -- foto elegida a mano; si es null se usa la del primer producto de la categoría
);

-- ----------------------------------------------------------------------------
-- Productos
-- ----------------------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text default '',
  size_label text default '', -- ej: "Torta entera - 8 porciones"
  price numeric(12,2) not null default 0,
  promo_price numeric(12,2), -- si tiene valor, se muestra como oferta
  promo_active boolean not null default false,
  sizes jsonb not null default '[]'::jsonb, -- [{ "label": "Chico", "price": 10000 }, ...] — si está vacío, se usa size_label/price de arriba
  images text[] not null default '{}', -- urls (Supabase Storage o externas)
  position integer not null default 0,
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on products(category_id);
create index if not exists products_position_idx on products(position);

-- ----------------------------------------------------------------------------
-- Configuración del sitio (fila única)
-- ----------------------------------------------------------------------------
create table if not exists site_settings (
  id integer primary key default 1,
  store_name text not null default 'Bakery Box',
  whatsapp_number text not null default '5491162797363',
  bank_alias text default '',
  bank_cbu text default '',
  bank_holder text default '',
  bank_extra_note text default '',
  delivery_note text default 'Coordinamos el costo y la zona de envío por WhatsApp.',
  pickup_address text default '',
  instagram_url text default '',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into site_settings (id) values (1)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Pedidos (registro interno de lo que se manda por WhatsApp)
-- ----------------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  delivery_method text not null default 'retiro', -- 'retiro' | 'delivery'
  address text default '',
  payment_method text not null default 'efectivo', -- 'transferencia' | 'efectivo'
  items jsonb not null default '[]',
  total numeric(12,2) not null default 0,
  status text not null default 'nuevo', -- 'nuevo' | 'confirmado' | 'entregado' | 'cancelado'
  notes text default '',
  delivery_date date,
  discount_code text,
  discount_amount numeric(12,2) not null default 0
);

-- ----------------------------------------------------------------------------
-- Códigos de descuento (se gestionan desde el panel de administrador)
-- ----------------------------------------------------------------------------
create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null default 'percent', -- 'percent' | 'fixed'
  value numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint discount_codes_type_check check (type in ('percent', 'fixed')),
  constraint discount_codes_value_check check (value > 0)
);

-- ----------------------------------------------------------------------------
-- Trigger para updated_at en productos
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
before update on products
for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table categories enable row level security;
alter table products enable row level security;
alter table site_settings enable row level security;
alter table orders enable row level security;
alter table discount_codes enable row level security;

-- Lectura pública: cualquiera puede ver categorías activas y productos activos
drop policy if exists "public read active categories" on categories;
create policy "public read active categories"
on categories for select
to anon
using (active = true);

drop policy if exists "public read active products" on products;
create policy "public read active products"
on products for select
to anon
using (active = true);

drop policy if exists "public read settings" on site_settings;
create policy "public read settings"
on site_settings for select
to anon
using (true);

-- Cualquiera (incluso sin login) puede crear un pedido desde el checkout
drop policy if exists "public insert orders" on orders;
create policy "public insert orders"
on orders for insert
to anon
with check (true);

-- Cualquiera puede leer códigos de descuento activos (para validarlos en el carrito)
drop policy if exists "public read active discount codes" on discount_codes;
create policy "public read active discount codes"
on discount_codes for select
to anon
using (active = true);

-- Admin autenticado: acceso total a todo
drop policy if exists "admin full access categories" on categories;
create policy "admin full access categories"
on categories for all
to authenticated
using (true)
with check (true);

drop policy if exists "admin full access products" on products;
create policy "admin full access products"
on products for all
to authenticated
using (true)
with check (true);

drop policy if exists "admin full access settings" on site_settings;
create policy "admin full access settings"
on site_settings for all
to authenticated
using (true)
with check (true);

drop policy if exists "admin full access orders" on orders;
create policy "admin full access orders"
on orders for all
to authenticated
using (true)
with check (true);

drop policy if exists "admin full access discount codes" on discount_codes;
create policy "admin full access discount codes"
on discount_codes for all
to authenticated
using (true)
with check (true);

-- ============================================================================
-- Storage: bucket público para fotos de productos
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images"
on storage.objects for select
to public
using (bucket_id = 'product-images');

drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images');

drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');

-- ============================================================================
-- Datos de ejemplo (categorías y productos reales de Bakery Box)
-- Podés editar o borrar todo esto desde el panel de administrador después.
-- ============================================================================
insert into categories (name, slug, position) values
  ('Tortas', 'tortas', 1),
  ('Cheesecakes', 'cheesecakes', 2),
  ('Cajas y mini postres', 'cajas-y-mini-postres', 3),
  ('Granolas', 'granolas', 4)
on conflict (slug) do nothing;

insert into products (category_id, name, slug, description, size_label, price, promo_price, promo_active, images, position, featured)
select c.id, v.name, v.slug, v.description, v.size_label, v.price, v.promo_price, v.promo_active, v.images, v.position, v.featured
from (values
  (
    'tortas',
    'Torta mousse de chocolate con garrapiñada',
    'torta-mousse-chocolate-garrapinada',
    'Mousse de chocolate semiamargo, bizcochuelo húmedo y garrapiñada crocante por encima. Una de nuestras tortas más pedidas.',
    'Torta entera - 10 a 12 porciones',
    32000::numeric, null::numeric, false,
    array['/images/products/torta-mousse-chocolate-garrapinada.webp'],
    1, true
  ),
  (
    'tortas',
    'Torta de chocolate con ganache',
    'torta-chocolate-ganache',
    'Bizcochuelo de chocolate, relleno de dulce de leche y cubierta de ganache de chocolate con decoración a manga.',
    'Torta entera - 10 a 12 porciones',
    30000::numeric, null::numeric, false,
    array['/images/products/torta-chocolate-ganache.webp'],
    2, true
  ),
  (
    'tortas',
    'Torta de crumble',
    'torta-crumble-blanca',
    'Bizcochuelo relleno con crema y cubierto con crumble crocante casero. Suave, cremosa y no demasiado dulce.',
    'Torta entera - 10 a 12 porciones',
    29000::numeric, null::numeric, false,
    array['/images/products/torta-crumble-blanca.webp'],
    3, false
  ),
  (
    'tortas',
    'Mil hojas de dulce de leche',
    'milhojas-dulce-de-leche',
    'Capas de masa hojaldrada bien crocante, dulce de leche y un toque de merengue tostado arriba. Clásico de siempre.',
    'Entera - 10 a 12 porciones',
    31000::numeric, null::numeric, false,
    array['/images/products/milhojas-dulce-de-leche.webp'],
    4, true
  ),
  (
    'cheesecakes',
    'Cheesecake vasco',
    'cheesecake-vasco',
    'Cheesecake estilo vasco, cremoso por dentro y bien tostado por fuera. Se sirve solo o con coulis de frutos rojos.',
    'Entero - 10 a 12 porciones',
    28000::numeric, null::numeric, false,
    array['/images/products/cheesecake-vasca-entera.webp', '/images/products/cheesecake-vasca-frutos-rojos.webp'],
    1, true
  ),
  (
    'cajas-y-mini-postres',
    'Caja de mini postres surtidos',
    'caja-mini-postres-surtidos',
    'Selección de 6 mini postres: brownie, cheesecake de frutos rojos, lemon pie, crumble, budín y limón. Ideal para compartir o regalar.',
    'Caja x6 unidades',
    12000::numeric, null::numeric, false,
    array['/images/products/box-mini-postres.webp'],
    1, true
  ),
  (
    'granolas',
    'Granola artesanal con frutos secos',
    'granola-artesanal-frutos-secos',
    'Granola horneada casera con avena, almendras, maní, avellanas y pasas. Sin conservantes.',
    'Bolsa x500g',
    6500::numeric, null::numeric, false,
    array['/images/products/granola-artesanal.webp'],
    1, false
  )
) as v(cat_slug, name, slug, description, size_label, price, promo_price, promo_active, images, position, featured)
join categories c on c.slug = v.cat_slug
on conflict (slug) do nothing;
