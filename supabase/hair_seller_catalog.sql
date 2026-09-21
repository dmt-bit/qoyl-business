-- Hair seller catalog + Style Match placement tracking.
--
-- Extends the tables that already exist in this shared project instead of
-- creating parallel ones: hair sellers are fake_hair_brand_accounts (not
-- brand_accounts.account_type), their products are fake_hair_products, and
-- placement/click logging extends style_match_product_impressions (already
-- used by qoyl-beta for brand_catalog_products). color_compatibility did NOT
-- exist yet, so it is created here. RUN THIS FILE BEFORE using the new
-- endpoints/dashboard/admin tab -- approving a hair seller now writes the
-- new tier/product_types/styles_served columns.

-- 1. Sellers -----------------------------------------------------------
alter table fake_hair_brand_applications
  add column if not exists tier text not null default 'standard'
    check (tier in ('standard', 'featured')),
  add column if not exists product_types text[],
  add column if not exists styles_served text[];

alter table fake_hair_brand_accounts
  add column if not exists tier text not null default 'standard'
    check (tier in ('standard', 'featured')),
  add column if not exists product_types text[],
  add column if not exists styles_served text[];

-- 2. Catalog ------------------------------------------------------------
alter table fake_hair_products
  add column if not exists hair_type text
    check (hair_type in ('braiding_hair', 'crochet', 'wig', 'clip_in', 'tape_in', 'sew_in')),
  add column if not exists compatible_styles text[] not null default '{}',
  add column if not exists blends_with_curl_types text[] not null default '{}',
  add column if not exists available_colors text[] not null default '{}',
  add column if not exists price_per_pack_usd numeric(8, 2),
  add column if not exists packs_needed_by_length jsonb,
  add column if not exists can_be_heat_styled boolean not null default false,
  add column if not exists hair_preference text
    check (hair_preference in ('human', 'synthetic', 'heat_resistant_synthetic')),
  add column if not exists amazon_asin text,
  add column if not exists in_stock boolean not null default true,
  add column if not exists shed_rating smallint check (shed_rating between 1 and 5),
  add column if not exists updated_at timestamptz not null default now();

-- One row per seller + product name, so catalog re-uploads update in place.
create unique index if not exists fake_hair_products_brand_product_name_key
  on fake_hair_products (brand_id, product_name);

-- 3. Color compatibility ------------------------------------------------
-- Maps a shopper's hair color family (derived from their profile/photo) to
-- the conventional extension color codes that blend with it.
create table if not exists color_compatibility (
  id uuid primary key default gen_random_uuid(),
  hair_color_family text not null,
  product_color text not null,
  match_score smallint not null default 100 check (match_score between 1 and 100),
  unique (hair_color_family, product_color)
);

alter table color_compatibility enable row level security;

drop policy if exists "Allow anon select" on color_compatibility;
create policy "Allow anon select"
  on color_compatibility for select
  to anon, authenticated
  using (true);

insert into color_compatibility (hair_color_family, product_color, match_score) values
  ('black', '1', 100), ('black', '1b', 100), ('black', '2', 70),
  ('dark_brown', '2', 100), ('dark_brown', '1b', 70), ('dark_brown', '4', 80),
  ('brown', '4', 100), ('brown', '2', 70), ('brown', '30', 70),
  ('auburn', '30', 100), ('auburn', '33', 90), ('auburn', '350', 90), ('auburn', '4', 60),
  ('red', '350', 100), ('red', '99j', 80), ('red', '33', 80),
  ('blonde', '27', 100), ('blonde', '613', 90), ('blonde', '30', 60),
  ('gray', 'grey', 100), ('gray', 'silver', 100), ('gray', '613', 50)
on conflict (hair_color_family, product_color) do nothing;

-- 4. Impressions / clicks -------------------------------------------------
-- Existing rows (brand_catalog_products placements) keep working: the new
-- columns are nullable and impression_type defaults to the placement value.
-- Clicks are logged as their own 'click_through' rows for hair sellers.
alter table style_match_product_impressions
  add column if not exists fake_hair_product_id uuid references fake_hair_products(id),
  add column if not exists hair_seller_id uuid references fake_hair_brand_accounts(id),
  add column if not exists impression_type text not null default 'shopping_list_placement'
    check (impression_type in ('shopping_list_placement', 'click_through')),
  add column if not exists was_featured boolean,
  add column if not exists color_matched boolean,
  add column if not exists matched_color text,
  add column if not exists curl_type text,
  add column if not exists hair_preference text;

create index if not exists style_match_impressions_hair_seller_idx
  on style_match_product_impressions (hair_seller_id, created_at);
