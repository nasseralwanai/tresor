# Trésor — Item Source of Truth Architecture

**Author:** Nigel, System Architect  
**Date:** 2026-08-07  
**For:** Nasser (Product Owner), Dwight (Dev Lead), Trésor team  
**Status:** Final — actionable  
**Question posed:** *"What is your source of truth here? Are we always going to upload everything and store it in the database, or is there a process to add items? Do these items become universal in the database?"*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Approach Options](#3-approach-options)
4. [Brand Catalog Design](#4-brand-catalog-design)
5. [AI-Powered Item Identification](#5-ai-powered-item-identification)
6. [Recommendation](#6-recommendation)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Sources](#8-sources)

---

## 1. Executive Summary

**Nasser's question cuts to the core data architecture of Trésor.** Today, every item is a standalone row owned by a single user — brand and model are free-text, there's no catalog, no normalization, and no connection between two users who own the same bag. This works for MVP but blocks future features: duplicate detection, collection insights, price tracking across same-model items, "who wore it best," and investment tracking.

**Recommendation: Hybrid Catalog Model.**

- Items remain **user-owned** (each user's copy is their source of truth for condition, photos, purchase price, personal notes).
- A new **`catalog_items`** table provides a shared, normalized reference of brands → models → variants. This catalog is **seeded by AI identification** and **grown organically** as users add items — not pre-populated with a million SKUs.
- When a user adds an item, **AI suggests a catalog match** (from photo or text). The user confirms. If no match exists, a new catalog entry is created automatically. Future items that match get linked.
- **External APIs** (eBay Browse, Chrono24 scrapers, Vestiaire scrapers) enrich pricing and market data at the catalog level — not per-user-item — so one price lookup serves all owners of the same model.
- **Privacy is preserved**: catalog entries contain only product facts (brand, model, materials, reference images). User-specific data (photos, condition, purchase price, notes, ownership) stays on the `items` row and is governed by existing RLS policies.

This approach costs ~2-3 weeks of additional development, adds negligible infrastructure cost (~$15-20/month for AI identification at Trésor's scale), and unlocks every "creative feature" in the brief that depends on knowing two items are the same product.

---

## 2. Current State Analysis

### 2.1 Current Item Schema

The `items` table (migration `0001_initial_schema.sql`, amended by `0005_items_visibility_columns.sql`) stores:

| Column | Type | Source of Truth? |
|---|---|---|
| `id` | UUID | System-generated |
| `owner_id` | UUID FK → profiles | User-bound |
| `circle_id` | UUID FK → circles | User-bound |
| `brand` | text NOT NULL | **Free text** — no validation, no normalization |
| `model_name` | text | **Free text** — "Classic Flap", "Classic flap medium", "Medium Classic Flap Bag" are three different strings |
| `category` | item_category enum | Constrained to 7 values (bag, jewelry, watch, shoes, clothing, accessories, other) |
| `color` | text | Free text |
| `size` | text | Free text |
| `material` | text | Free text |
| `condition` | item_condition enum | User-selected |
| `purchase_price` | decimal(10,2) | User-entered |
| `estimated_value` | decimal(10,2) | AI-suggested or user-entered |
| `currency` | text (default 'AED') | System |
| `serial_number` | text | User-entered |
| `authenticity_verified` | boolean | User-set |
| `notes` | text | User-entered |
| `ai_brand_confidence` | float | AI Vision result |
| `ai_identification` | jsonb | Full AI Vision response |
| `source_url` | text | Link-add origin |
| `primary_image_url` | text | User photo |
| `is_private` | boolean | User-set (migration 0005) |
| `is_lendable` | boolean | User-set (migration 0005) |
| `created_at` / `updated_at` | timestamptz | System |

### 2.2 What's Captured Well

- **Ownership and lending lifecycle** — `owner_id`, `circle_id`, `is_lendable`, `is_private`, borrow transactions all work correctly.
- **AI identification scaffolding** — `ai_brand_confidence` and `ai_identification` jsonb columns are already in place, ready to receive Vision API responses.
- **Price history** — `price_history` table exists and can track valuations over time per item.
- **Wishlist linkage** — `wishlist_items.item_id` FK allows wishlists to reference real items in the circle.

### 2.3 What's Missing for a "Source of Truth" Model

| Gap | Impact | Severity |
|---|---|---|
| **No brand catalog** — "Chanel", "chanel", "CHANEL", "Coco Chanel" are all valid `brand` text values | Cannot group, filter, or match items by brand reliably. AI identification can't normalize to a canonical brand. | 🔴 Critical |
| **No model catalog** — "Classic Flap Medium" and "Classic Flap Med" are different strings | Cannot detect duplicates, cannot aggregate pricing across same-model items, cannot show "3 members own this bag" | 🔴 Critical |
| **No product reference number / SKU** | Luxury items have reference numbers (e.g., Chanel A01112 for Classic Flap Medium). Without this, matching is fuzzy and error-prone. | 🟡 Medium |
| **No canonical product imagery** | Each user's photos are their own. There's no shared "reference image" for a product that AI can match against. | 🟡 Medium |
| **`estimated_value` is per-item, not per-model** | If Sarah and Layla both own a Chanel Classic Flap Medium Black Caviar, each has a separate `estimated_value`. Market data should be per-model, shared across owners. | 🟡 Medium |
| **No deduplication mechanism** | Nothing prevents 15 slightly different text entries for the same bag. No fuzzy matching, no merge flow. | 🟡 Medium |
| **`item_category` enum is rigid** | Cannot add subcategories (flap bags, totes, etc.) without painful Postgres enum migration. The `category-taxonomy.md` research defines 8 primary categories with ~60 subcategories — the enum can't represent this. | 🟡 Medium |

### 2.4 The Core Problem

> When Sarah adds "Chanel Classic Flap Medium Black Caviar" and Layla adds the same bag, they are **two completely independent rows** with no structural connection. The system cannot answer: "Who else owns this bag?", "What's the market value of this model?", or "Is this a duplicate?" — because "this bag" doesn't exist as a concept. Only "Sarah's bag" and "Layla's bag" exist.

This is the question Nasser is really asking: **should "Chanel Classic Flap Medium Black Caviar" be a first-class entity in the database that multiple user-items can reference?**

The answer is **yes** — but the path to getting there matters.

---

## 3. Approach Options

### 3A. STAY MANUAL (Current Model)

**Description:** Keep the current schema. Each user enters items independently via AI photo identification, link parsing, or manual form. Brand and model are free-text. No catalog, no normalization, no deduplication.

#### Pros

| Pro | Detail |
|---|---|
| **Zero additional development cost** | No schema changes, no new tables, no matching logic, no merge UI. |
| **Maximum privacy** | No shared catalog means no data leaks between users beyond what RLS already permits. |
| **Simplest mental model** | Each item is self-contained. No confusion about "is this my data or shared data?" |
| **Works today** | The current schema already supports this. AI identification fills in fields; user confirms. |

#### Cons

| Con | Detail |
|---|---|
| **No duplicate detection** | Brief's creative feature: *"You already own a similar Balenciaga City in black — are you sure?"* — impossible without normalization. |
| **No cross-user item matching** | Brief's creative feature: *"Who wore it best"* — can't detect that two members own the same bag. |
| **No aggregate pricing** | Brief's creative feature: *"Investment tracker — your Hermès Birkin is up 12%"* — market data is per-model, not per-user-item. Without a model entity, each item needs its own price lookup. |
| **No collection insights** | Brief's creative feature: *"You have 4 black bags but no evening clutch"* — requires categorization beyond free-text brand/model. |
| **Brand filter is unreliable** | "Chanel" vs "chanel" vs "CHANEL" would appear as three separate filter options. |
| **Price tracking is N× harder** | Without model-level grouping, price tracking must run per-item instead of per-model. For 15 users × 50 items = 750 price lookups vs ~200 lookups if items are grouped by model. |
| **AI identification has no anchor** | AI returns "Chanel Classic Flap Medium" — but there's nothing to match that against. Every identification is a fresh guess with no catalog to validate against. |

#### Verdict

**Insufficient for the brief's feature set.** The brief explicitly lists duplicate detection, cross-user matching, investment tracking, and collection insights as target features. All require item normalization. Manual-only blocks these permanently.

---

### 3B. CROWDSOURCED CATALOG (Universal Items)

**Description:** Items become universal. When Sarah adds "Chanel Classic Flap Medium", a catalog entry is created. When Layla adds the same bag, the system auto-matches it to Sarah's catalog entry. All users see and benefit from the shared catalog. Think Goodreads for luxury items — the "book" is the catalog entry, and each user has their own "copy" on their "shelf."

#### Pros

| Pro | Detail |
|---|---|
| **Automatic deduplication** | Same model = same catalog entry. No duplicate brands/models. |
| **Rich cross-user features** | "3 members own this bag", "Who wore it best", aggregate pricing, shared reference images. |
| **Network effects** | More users → richer catalog → better AI matching → better experience for everyone. |
| **Single source of truth for product data** | Brand, model, materials, reference number, retail price, market value — all stored once at the catalog level. |
| **Efficient price tracking** | One price lookup per catalog model, shared across all owners. |

#### Cons

| Con | Detail |
|---|---|
| **Privacy tension** | Not all items should be in a shared catalog. A user may want to track a personal item without it becoming a "universal" entry. Requires careful privacy controls. |
| **Catalog quality management** | Who approves new entries? Who merges duplicates? Who corrects wrong data? Requires moderation workflow or admin role. |
| **Cold start problem** | Empty catalog at launch. First users create all entries. Quality is low until critical mass. |
| **Overkill for 5-15 users** | Goodreads has 90M+ users. Trésor has 5-15. The network effects that make crowdsourced catalogs powerful don't apply at this scale. A catalog of ~200-500 models (covering the UAE luxury market) would serve this circle completely. |
| **Matching complexity** | Auto-matching requires fuzzy text matching + image similarity. False positives ("Chanel Classic Flap" matching "Chanel Reissue 2.55") erode trust. Needs human confirmation. |
| **Schema complexity** | New tables: `catalog_items`, `catalog_brands`, `catalog_models`, `catalog_variants`. Migration to link existing items. Merge/split tooling. |

#### Verdict

**Right idea, wrong implementation for Trésor's scale.** A universal crowdsourced catalog is a marketplace architecture — it's what Vestiaire Collective, Chrono24, and StockX do. Trésor is a private circle of 5-15 women, not a marketplace. The catalog concept is correct, but the "crowdsourced/universal" framing implies open contribution and public visibility that doesn't fit a private circle app.

---

### 3C. EXTERNAL PRODUCT DATABASE (Third-Party Catalog)

**Description:** Integrate with external luxury databases (Vestiaire Collective, Chrono24, WatchCharts, eBay) for brand/model lookup. When a user adds an item, the system queries these databases to find a matching product entry and links to it.

#### Pros

| Pro | Detail |
|---|---|
| **No cold start** | External databases already have millions of products. No need to build a catalog from scratch. |
| **Authoritative data** | Brand catalogs from the brands themselves (Chanel.com, Hermes.com) are the gold standard. |
| **Market pricing included** | Chrono24, StockX, Vestiaire all provide real-time market pricing. No separate price tracking needed. |
| **Less maintenance** | The external provider maintains the catalog. Trésor just queries it. |

#### Cons

| Con | Detail |
|---|---|
| **No public APIs exist for the key platforms** — This is the critical finding from our research: |
| | **Vestiaire Collective** — No public developer API. Scraping only (Apify, custom `__NEXT_DATA__` parser). [[1]](#source-1) |
| | **Chrono24** — No public API for price data. Only a dealer listing import API (for sellers to push listings, not pull market data). ChronoPulse is web-only. [[2]](#source-2) |
| | **FarFetch** — Shut down their public API program. Third-party scrapers only. [[3]](#source-3) |
| | **The RealReal** — No public API. Scraping only. |
| | **Lyst** — No public API (17K+ brands aggregated, but no developer access). |
| | **StockX** — Official API exists but requires approval (selective). No published pricing. |
| **eBay Browse API is the only free, official option** — Covers all categories but: only active listing prices (no sold-price data since 2020), broad but not luxury-specialized, 5,000 calls/day default. [[4]](#source-4) |
| **Data quality varies** — eBay listings have inconsistent naming ("Chanel flap bag black" vs "CHANEL Classic Flap Medium Lambskin Black GHW"). Not normalized. |
| **Scraping is legally risky** — Vestiaire, FarFetch, Chrono24 ToS prohibit scraping. Using scraping APIs (Apify, ScrapingBee) shifts some risk but doesn't eliminate it. [[5]](#source-5) |
| **Dependency on unstable sources** — Scrapers break when sites change. Chanel.com and Hermes.com have minimal structured data and heavy JS — hardest to scrape. |
| **No luxury-specific product database API exists** — There is no "luxury item database API" you can plug into. The market is fragmented. Every platform guards their data. |
| **Cost** — Scraping infrastructure: ~$100-150/month (Apify + ScrapingBee + ScrapingBot). DataGats.com (aggregator covering 90+ luxury sources) is custom-quote, likely $500+/month. [[6]](#source-6) |

#### Verdict

**Not viable as a primary strategy.** The luxury market has deliberately closed APIs. The only free, official API (eBay) provides listing-level data, not a normalized product catalog. Scraping is legally risky, technically fragile, and ethically questionable for a private app. External databases should be used for **price enrichment only** (eBay API for market price benchmarks), not as the catalog source of truth.

---

### 3D. HYBRID: Manual Entry + AI Catalog Matching (RECOMMENDED)

**Description:** Items start as manual entries (via AI photo ID, link parsing, or form). A lightweight catalog grows organically: when a user adds an item, AI identifies the brand/model and checks the existing catalog for a match. If found, the item is linked to the catalog entry. If not found, a new catalog entry is auto-created. The user always confirms the match. External APIs (eBay) enrich catalog-level pricing.

#### Architecture

```
User adds item (photo / link / manual)
         ↓
   AI Vision identifies brand, model, category, color, material
         ↓
   System searches catalog_items for fuzzy match
         ↓
    ┌────┴────┐
    │         │
 MATCH    NO MATCH
    │         │
    ↓         ↓
 Show suggestion   Auto-create new
 "Is this your     catalog_item from
  Chanel Classic   AI identification
  Flap Medium?"    → user confirms
    │         │
    └────┬────┘
         ↓
   items.catalog_item_id = matched/created catalog entry
         ↓
   User completes item-specific fields
   (condition, photos, purchase price, notes)
         ↓
   Item saved with catalog link
```

#### Pros

| Pro | Detail |
|---|---|
| **Best of all worlds** — Manual entry flexibility + catalog normalization + AI-powered matching + external price enrichment. |
| **Organic catalog growth** — Catalog starts empty and grows with each item added. By the time the circle has 200-500 items, the catalog covers their entire collection. No cold start problem — every user's first item creates a catalog entry. |
| **User-confirmed matching** — AI suggests, user confirms. No false-positive auto-merges. Trust is preserved. |
| **Privacy-respecting** — Catalog entries contain only product facts (brand, model, materials, reference images). User-specific data (photos, condition, purchase price, ownership) stays on the `items` row. Private items still link to catalog entries but the link is invisible to other users (governed by RLS on `items`, not on `catalog_items`). |
| **Efficient price tracking** — Price lookups run per catalog model, not per item. 200 catalog models → 200 eBay API calls, not 750 item-level calls. |
| **Enables all brief features** — Duplicate detection, cross-user matching, investment tracking, collection insights, "who wore it best" — all work because the catalog provides the normalization layer. |
| **Modest development cost** — ~2-3 weeks of additional work (schema migration, catalog CRUD, AI matching Edge Function, confirmation UI). |
| **Low ongoing cost** — AI identification: ~$0.002-0.005 per item (GPT-4o-mini). At 15 users × 50 items = 750 items, one-time identification cost is ~$1.50-3.75. eBay API is free. |

#### Cons

| Con | Detail |
|---|---|
| **Catalog quality depends on AI accuracy** — If AI misidentifies a bag, the catalog gets a wrong entry. Mitigated by user confirmation and admin merge capability. |
| **Matching algorithm needs tuning** — Fuzzy text matching on brand + model + color + material. Needs a similarity threshold. Too loose → false matches. Too strict → duplicates persist. |
| **Merge/split workflow needed** — When duplicate catalog entries are discovered (e.g., "Classic Flap Medium" and "Classic Flap Med" created before matching was added), an admin needs a merge tool. |
| **Migration for existing items** — Current items have no `catalog_item_id`. Need a backfill job that runs AI identification on existing items and creates/links catalog entries. |

#### Verdict

**This is the right approach for Trésor.** It balances the catalog benefits (normalization, deduplication, aggregate pricing, cross-user features) with Trésor's constraints (small private circle, privacy-first, limited development budget, UAE luxury market focus). The catalog grows organically from real usage, AI does the heavy lifting, and the user stays in control.

---

## 4. Brand Catalog Design

### 4.1 Schema Overview

Three new tables: `brands`, `catalog_items`, and `catalog_images`. The existing `items` table gains a `catalog_item_id` FK.

```
┌──────────┐     ┌──────────────────┐     ┌──────────────┐
│  brands  │────<│  catalog_items   │────<│ catalog_images│
│          │     │                  │     │              │
│ id       │     │ id               │     │ id           │
│ name     │     │ brand_id (FK)    │     │ catalog_item_id (FK)
│ slug     │     │ model_name       │     │ storage_path  │
│ logo_url │     │ category         │     │ is_reference  │
│ verified │     │ subcategory      │     │ display_order │
└──────────┘     │ reference_number │     └──────────────┘
                 │ color            │
                 │ material         │     ┌──────────────┐
                 │ size_variants    │     │    items     │
                 │ retail_price     │────<│ (existing)   │
                 │ currency         │     │              │
                 │ description      │     │ + catalog_item_id (FK, nullable)
                 │ specs (jsonb)    │     │              │
                 │ match_confidence │     │ owner_id     │
                 │ source           │     │ condition    │
                 │ created_by       │     │ photos       │
                 │ created_at       │     │ purchase_price│
                 │ updated_at       │     │ notes        │
                 └──────────────────┘     └──────────────┘
```

### 4.2 `brands` Table

A curated list of luxury brands. Seeded with the ~50-80 brands most relevant to the UAE luxury market. Grows as users add items from new brands.

```sql
-- ============================================================================
-- Migration: Brand catalog
-- ============================================================================

create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,      -- Canonical: "Chanel", "Hermès", "Louis Vuitton"
  slug        text not null unique,      -- URL-safe: "chanel", "hermes", "louis-vuitton"
  aliases     text[] not null default '{}', -- Alternate spellings: ["CHANEL", "Coco Chanel", "chanel"]
  logo_url    text,
  category_focus text[],                 -- ["handbag", "jewelry", "watch"] — primary categories
  verified    boolean not null default false, -- Admin-verified canonical brand
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_brands_slug on public.brands (slug);
create index if not exists idx_brands_name_trgm on public.brands 
  using gin (name gin_trgm_ops);  -- Requires pg_trgm extension for fuzzy search

-- Enable trigram extension for fuzzy brand matching
create extension if not exists pg_trgm;

-- RLS: All authenticated users can read brands (it's a shared reference catalog)
alter table public.brands enable row level security;
create policy "brands_select_all_authenticated"
  on public.brands for select
  using (auth.role() = 'authenticated');
-- Only service_role (Edge Functions) can insert/update brands
-- Users create brands indirectly via the AI matching Edge Function
```

**Seed data** — The top brands for the UAE luxury market (based on the category taxonomy research and brief context):

```sql
insert into public.brands (name, slug, aliases, category_focus, verified) values
  ('Chanel', 'chanel', ARRAY['CHANEL', 'Coco Chanel'], ARRAY['handbag','jewelry','watch','shoes','clothing'], true),
  ('Hermès', 'hermes', ARRAY['Hermes', 'HERMÈS', 'hermès'], ARRAY['handbag','jewelry','watch','accessories','home'], true),
  ('Louis Vuitton', 'louis-vuitton', ARRAY['LV', 'Louis Vuitton Malletier'], ARRAY['handbag','accessories','shoes','clothing'], true),
  ('Dior', 'dior', ARRAY['Christian Dior', 'Dior'], ARRAY['handbag','jewelry','shoes','clothing'], true),
  ('Cartier', 'cartier', ARRAY['Cartier'], ARRAY['jewelry','watch'], true),
  ('Rolex', 'rolex', ARRAY['Rolex'], ARRAY['watch'], true),
  ('Van Cleef & Arpels', 'van-cleef-arpels', ARRAY['VCA', 'Van Cleef'], ARRAY['jewelry','watch'], true),
  ('Saint Laurent', 'saint-laurent', ARRAY['YSL', 'Yves Saint Laurent', 'Saint Laurent Paris'], ARRAY['handbag','shoes','clothing','accessories'], true),
  ('Gucci', 'gucci', ARRAY['GUCCI'], ARRAY['handbag','shoes','clothing','accessories'], true),
  ('Bottega Veneta', 'bottega-veneta', ARRAY['BV'], ARRAY['handbag','shoes','clothing'], true),
  ('Patek Philippe', 'patek-philippe', ARRAY['Patek', 'PP'], ARRAY['watch'], true),
  ('Audemars Piguet', 'audemars-piguet', ARRAY['AP'], ARRAY['watch'], true),
  ('Bvlgari', 'bvlgari', ARRAY['Bulgari'], ARRAY['jewelry','watch'], true),
  ('Tiffany & Co.', 'tiffany-co', ARRAY['Tiffany', 'Tiffany and Co'], ARRAY['jewelry'], true),
  ('Christian Louboutin', 'christian-louboutin', ARRAY['Louboutin'], ARRAY['shoes'], true),
  ('Celine', 'celine', ARRAY['Céline', 'CELINE'], ARRAY['handbag','shoes','clothing'], true),
  ('Loewe', 'loewe', ARRAY['LOEWE'], ARRAY['handbag','clothing','accessories'], true),
  ('Fendi', 'fendi', ARRAY['FENDI'], ARRAY['handbag','clothing','accessories'], true),
  ('Goyard', 'goyard', ARRAY['GOYARD'], ARRAY['handbag','accessories'], true),
  ('Omega', 'omega', ARRAY['OMEGA'], ARRAY['watch'], true),
  ('Balenciaga', 'balenciaga', ARRAY[], ARRAY['handbag','shoes','clothing'], true),
  ('Prada', 'prada', ARRAY[], ARRAY['handbag','shoes','clothing'], true),
  ('Valentino', 'valentino', ARRAY['Valentino Garavani'], ARRAY['handbag','shoes','clothing'], true),
  ('Burberry', 'burberry', ARRAY[], ARRAY['clothing','accessories'], true),
  ('Tom Ford', 'tom-ford', ARRAY[], ARRAY['accessories','fragrance'], true),
  ('Jacquemus', 'jacquemus', ARRAY[], ARRAY['handbag','clothing'], true),
  ('Manolo Blahnik', 'manolo-blahnik', ARRAY[], ARRAY['shoes'], true),
  ('Richard Mille', 'richard-mille', ARRAY['RM'], ARRAY['watch'], true),
  ('Hublot', 'hublot', ARRAY[], ARRAY['watch'], true),
  ('TAG Heuer', 'tag-heuer', ARRAY['TAG'], ARRAY['watch'], true)
on conflict (slug) do nothing;
```

### 4.3 `catalog_items` Table

The normalized product reference. One row per unique brand + model + variant combination.

```sql
create table if not exists public.catalog_items (
  id                uuid primary key default gen_random_uuid(),
  brand_id          uuid not null references public.brands(id) on delete restrict,
  model_name        text not null,              -- "Classic Flap", "Birkin", "Submariner"
  model_variant     text,                       -- "Medium", "30", "Date", "Black Dial"
  category          item_category,              -- Reuses existing enum
  subcategory       text,                       -- "Flap Bags", "Top Handle", "Diving" (from taxonomy)
  reference_number  text,                       -- "A01112" (Chanel), "Togo Gold 30" (Hermès), "126610LN" (Rolex)
  color             text,                       -- "Black", "Gold", "Navy"
  material          text,                       -- "Caviar", "Togo", "Oystersteel"
  hardware          text,                       -- "Gold Hardware (GHW)", "Palladium Hardware (PHW)"
  size              text,                       -- "Medium", "30cm", "40mm"
  retail_price      decimal(10,2),              -- Current retail price (if still sold)
  retail_currency   text not null default 'AED',
  description       text,
  specs             jsonb not null default '{}', -- Flexible: { "dimensions": "30×25×12cm", "weight": "850g", ... }
  match_fingerprint text,                       -- Normalized string for fuzzy matching: "chanel|classic flap|medium|black|caviar"
  source            text not null default 'user_created', -- 'user_created' | 'ai_identified' | 'admin_imported' | 'external_api'
  source_url        text,                       -- Original URL if from link parsing
  ai_confidence     float,                      -- AI identification confidence when created
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (brand_id, model_name, model_variant, color, material)
);

-- Indexes
create index if not exists idx_catalog_items_brand on public.catalog_items (brand_id);
create index if not exists idx_catalog_items_category on public.catalog_items (category);
create index if not exists idx_catalog_items_fingerprint_trgm on public.catalog_items
  using gin (match_fingerprint gin_trgm_ops);  -- Fuzzy match search
create index if not exists idx_catalog_items_ref_number on public.catalog_items (reference_number) 
  where reference_number is not null;

-- RLS: All authenticated users can read catalog (it's a shared reference)
-- Only service_role can create/update (via Edge Functions with AI matching)
alter table public.catalog_items enable row level security;
create policy "catalog_items_select_all_authenticated"
  on public.catalog_items for select
  using (auth.role() = 'authenticated');
```

### 4.4 `catalog_images` Table

Reference images for catalog items — distinct from user photos. These are canonical product images used for AI matching and display.

```sql
create table if not exists public.catalog_images (
  id              uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  storage_path    text not null,
  image_source    text not null default 'user_contributed', -- 'user_contributed' | 'brand_website' | 'ai_generated'
  is_primary      boolean not null default false,
  display_order   int not null default 0,
  contributed_by  uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_catalog_images_item on public.catalog_images (catalog_item_id);

alter table public.catalog_images enable row level security;
create policy "catalog_images_select_all_authenticated"
  on public.catalog_images for select
  using (auth.role() = 'authenticated');
```

### 4.5 Linking Existing Items to Catalog

```sql
-- Add catalog_item_id to items table (nullable — existing items start unlinked)
alter table public.items
  add column if not exists catalog_item_id uuid references public.catalog_items(id) on delete set null;

create index if not exists idx_items_catalog_item_id on public.items (catalog_item_id)
  where catalog_item_id is not null;

-- Also add brand_id to items for faster brand filtering (denormalized from catalog_items)
alter table public.items
  add column if not exists brand_id uuid references public.brands(id) on delete set null;

create index if not exists idx_items_brand_id on public.items (brand_id);
```

### 4.6 How User Items Link to Catalog Entries

| Scenario | Flow |
|---|---|
| **AI photo identification** | Vision API returns brand + model → Edge Function searches `catalog_items` by fingerprint → if match (confidence ≥ 0.85), suggests link → user confirms → `items.catalog_item_id` set |
| **Link parsing** | URL parsed → brand + model extracted → same fingerprint search → suggest or auto-create catalog entry |
| **Manual entry** | User types brand (autocomplete from `brands` table) + model → fingerprint search → suggest match or create new |
| **No match found** | Edge Function creates new `catalog_items` row from AI data → sets `items.catalog_item_id` → future items that match will find this entry |

### 4.7 Photos: Shared vs Per-User

| Photo Type | Storage | Visibility | Purpose |
|---|---|---|---|
| **User item photos** (`item_photos` table) | Per-user, in `items` storage bucket | Governed by existing RLS (owner + circle members if not private) | User's actual photos of their item — for borrowing decisions, condition documentation |
| **Catalog reference images** (`catalog_images` table) | Shared, in a `catalog` storage bucket | All authenticated users | Canonical product image for display, AI matching, and identification |

When a user adds an item via photo, the system can optionally offer to contribute their photo to the catalog reference images (with consent). This builds the catalog's visual library organically.

### 4.8 Estimated Value: Aggregated vs User-Reported

**Two-tier valuation model:**

```
┌─────────────────────────────────────────────────────┐
│  catalog_items.retail_price                         │
│  (Official retail price — from brand website/API)   │
│                      ↓                              │
│  price_history (per catalog_item_id, not per item)  │
│  (Market resale price — from eBay API, scrapers)    │
│  ┌───────────────────────────────────────┐          │
│  │ source: 'ebay_median'                 │          │
│  │ source: 'vestiaire_scrape'            │          │
│  │ source: 'chrono24_scrape'             │          │
│  │ source: 'stockx_api'                  │          │
│  └───────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
                      ↓ (joined at display time)
┌─────────────────────────────────────────────────────┐
│  items.estimated_value                              │
│  (User's item-specific valuation — adjusted for     │
│   condition, age, provenance. Default = catalog      │
│   market median, user can override.)                │
└─────────────────────────────────────────────────────┘
```

**Implementation:**

```sql
-- Add catalog_item_id to price_history for catalog-level price tracking
alter table public.price_history
  add column if not exists catalog_item_id uuid references public.catalog_items(id) on delete cascade;

-- Index for "latest market price for this model"
create index if not exists idx_price_history_catalog_recorded
  on public.price_history (catalog_item_id, recorded_at desc)
  where catalog_item_id is not null;
```

When displaying an item's estimated value:
1. If `items.estimated_value` is set and user-confirmed → show that.
2. If not → look up latest `price_history` for `items.catalog_item_id` → show market median.
3. If neither → show `catalog_items.retail_price` as "retail" with a note.

### 4.9 Duplicate Detection and Merging

**Detection** — A nightly Edge Function (or on-demand admin action) runs:

```sql
-- Find potential duplicate catalog items (same brand, similar model name)
select 
  a.id as item_a, b.id as item_b,
  a.model_name, b.model_name,
  similarity(a.match_fingerprint, b.match_fingerprint) as sim_score
from public.catalog_items a
join public.catalog_items b 
  on a.brand_id = b.brand_id 
  and a.id < b.id
  and a.category is not distinct from b.category
where similarity(a.match_fingerprint, b.match_fingerprint) > 0.7;
```

**Merge workflow:**
1. Admin sees potential duplicates in a moderation UI.
2. Admin selects which entry to keep (the one with more linked items / better data).
3. Merge function:
   - Re-links all `items.catalog_item_id` from the deprecated entry to the kept entry.
   - Merges `catalog_images` from both entries.
   - Merges `price_history` records.
   - Soft-deletes the deprecated catalog entry (or hard-deletes after confirmation).
4. Activity feed entry: "Catalog merge: [old model name] merged into [kept model name]"

```sql
-- Merge function (simplified)
create or replace function public.merge_catalog_items(
  keep_id uuid, 
  merge_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  -- Re-link items
  update public.items 
    set catalog_item_id = keep_id 
    where catalog_item_id = merge_id;
  
  -- Re-link price history
  update public.price_history 
    set catalog_item_id = keep_id 
    where catalog_item_id = merge_id;
  
  -- Re-link images
  update public.catalog_images 
    set catalog_item_id = keep_id 
    where catalog_item_id = merge_id;
  
  -- Delete the merged-away catalog item
  delete from public.catalog_items where id = merge_id;
end;
$$;
```

---

## 5. AI-Powered Item Identification

### 5.1 Can AI Identify Brand/Model from a Photo?

**Yes, with high accuracy for major brands and known models.** The existing research file (`research/luxury-recognition-app-research.md`) documents a two-tier approach:

#### Tier 1: Google Cloud Vision API (Logo + Web Detection)

| Feature | Capability | Pricing |
|---|---|---|
| **Logo Detection** | Recognizes product logos (Gucci, LV, Hermès, Chanel CC logo). Returns brand + confidence + bounding polygon. | First 1,000/month FREE. Then $1.50 per 1,000 images. [[7]](#source-7) |
| **Web Detection** | Finds visually similar images across the web. Excellent for "what is this bag?" lookups. | $3.50 per 1,000 images. [[7]](#source-7) |
| **Label Detection** | Identifies objects, materials, colors ("handbag", "leather", "black", "quilted"). | $1.50 per 1,000 images (1K free/mo). [[7]](#source-7) |

**Strength:** Cheap, fast, structured JSON output. Good for known logo brands.
**Limitation:** Only detects logos it has been trained on. Cannot identify a bag model from shape/stitching alone. Won't work on unbranded luxury items or items without visible logos.

#### Tier 2: LLM Vision (GPT-4o / Claude / Gemini)

When logo detection fails or returns low confidence, pass the image to a multimodal LLM to reason about the item. This is where model-level identification happens.

| Provider | Model | Cost per Image (approx.) | Strength |
|---|---|---|---|
| **OpenAI** | GPT-4o-mini | ~$0.0002 | Best value. Vision-capable. Use for high-volume first pass. [[8]](#source-8) |
| **OpenAI** | GPT-4o | ~$0.0036 | Strongest general brand/model reasoning. Best at naming specific models ("Hermès Birkin 30 Togo Gold"). [[8]](#source-8) |
| **Anthropic** | Claude Sonnet 4.6 | ~$0.004 | Excellent visual reasoning + detail extraction (materials, colors, hardware). [[8]](#source-8) |
| **Google** | Gemini 3 Flash | ~$0.0011 | Cheapest capable vision LLM. Free tier in Google AI Studio. [[8]](#source-8) |

**Recommended pipeline:** GPT-4o-mini first pass ($0.0002/image) → escalate to GPT-4o for low-confidence cases ($0.0036/image). Keeps cost under $0.01 per user photo in most cases. [[8]](#source-8)

#### Tier 3: Specialized Luxury Authentication (Optional, Not Recommended for Trésor)

| Provider | Capability | Pricing | Notes |
|---|---|---|---|
| **Entrupy** | AI authentication for luxury bags. Analyzes stitch density, material texture, hardware quality. 97.3% accuracy for authentication. [[9]](#source-9) | **$139/month minimum** (Petit plan: 25 tokens/month, ~$5.60/token). [[10]](#source-10) | Designed for resellers, not consumers. Requires physical device or app subscription. Overkill for a private circle app. |
| **Real Authentication** | Authentication + COA (Certificate of Authenticity) | $10/item (discounted via Whatnot partnership) [[11]](#source-11) | Also reseller-focused. |
| **ViSenze / Syte.ai** | Visual search for fashion. Find similar products from a photo. | Enterprise/custom (contact sales) | Requires indexing your own catalog. Powerful but designed for retailers. |

**Verdict on specialized APIs:** Entrupy is for authentication (is this real or fake?), not identification (what brand/model is this?). At $139/month minimum, it's 100× more expensive than GPT-4o-mini for identification. Trésor should NOT use Entrupy for item identification. It could be a future feature for authentication verification (e.g., "Is this bag authentic?") but that's a Phase 6+ consideration, not a source-of-truth concern.

### 5.2 How Accurate Is Current AI for Luxury Goods?

Based on industry research and our existing research file:

| Task | Accuracy | Source |
|---|---|---|
| **Brand identification (logo visible)** | 95-98% for top 50 luxury brands | Google Vision logo detection + GPT-4o [[7]](#source-7), [[9]](#source-9) |
| **Model identification (from photo)** | 70-85% for well-known models (Chanel Classic Flap, Hermès Birkin/Kelly, LV Neverfull) | GPT-4o Vision reasoning [[8]](#source-8) |
| **Model identification (rare/vintage models)** | 30-50% — AI may identify brand but not specific model | GPT-4o Vision reasoning [[8]](#source-8) |
| **Color/material identification** | 85-90% for common materials (caviar, lambskin, Togo, Epsom) | GPT-4o + Claude vision [[8]](#source-8) |
| **Authentication (real vs counterfeit)** | 97.3% (Entrupy, specialized) vs ~85% manual expert | Entrupy research [[9]](#source-9) |
| **Chanel vs Chanel-inspired** | 90%+ for GPT-4o — can distinguish quilted CC logo from similar designs | GPT-4o reasoning [[8]](#source-8) |
| **Hermès Birkin vs Kelly** | 95%+ — these have distinctly different silhouettes (top handle vs shoulder strap) | GPT-4o reasoning [[8]](#source-8) |

**Key limitation:** AI identification accuracy drops significantly for:
- Items without visible logos or brand markings
- Unusual angles, poor lighting, or cluttered backgrounds
- Rare, vintage, or limited-edition models not well-represented in training data
- Items that have been customized or modified

**Mitigation:** Always show confidence scores to users. Always let users confirm or correct. Never auto-link to a catalog entry below 85% confidence without explicit user confirmation.

### 5.3 Cost per Identification

| Pipeline Step | Cost per Image | When Used |
|---|---|---|
| Google Vision Logo Detection | $0.0015 (or free for first 1K/month) | Always (first pass) |
| GPT-4o-mini Vision | $0.0002 | Always (model identification) |
| GPT-4o Vision (escalation) | $0.0036 | Only when GPT-4o-mini confidence < 0.7 (~20% of cases) |
| **Average cost per identification** | **~$0.002 - $0.005** | Most items identified for under half a cent |

**For Trésor's scale (15 users × 50 items = 750 total items):**
- One-time identification of all items: ~$1.50 - $3.75
- Ongoing (new items, ~10/month): ~$0.02 - $0.05/month
- Google Vision free tier (1K/month) covers all logo detection for free

**This is negligible.** AI identification cost is not a factor in the architecture decision.

### 5.4 Recommended AI Identification Edge Function

```typescript
// supabase/functions/identify-item/index.ts (pseudocode)

export async function identifyItem(imageBase64: string): Promise<IdentificationResult> {
  // Step 1: Google Vision — logo detection + label detection
  const visionResult = await googleVision.annotate({
    image: { content: imageBase64 },
    features: [
      { type: 'LOGO_DETECTION', maxResults: 5 },
      { type: 'LABEL_DETECTION', maxResults: 10 },
      { type: 'WEB_DETECTION', maxResults: 5 },
    ],
  });

  // Step 2: GPT-4o-mini — full identification
  const gptResult = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: IDENTIFICATION_PROMPT },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    }],
    response_format: { type: 'json_object' },
  });

  const identification = JSON.parse(gptResult.choices[0].message.content);
  // { brand, model_name, model_variant, category, subcategory, color, material, 
  //   hardware, reference_number, confidence, notes }

  // Step 3: Escalate to GPT-4o if low confidence
  if (identification.confidence < 0.7) {
    const gpt4Result = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [/* same prompt + image */],
      response_format: { type: 'json_object' },
    });
    return JSON.parse(gpt4Result.choices[0].message.content);
  }

  // Step 4: Search catalog for existing match
  const fingerprint = buildFingerprint(identification); // "chanel|classic flap|medium|black|caviar"
  const catalogMatch = await supabase
    .from('catalog_items')
    .select('id, model_name, brand_id')
    .filter('match_fingerprint', '%', fingerprint)
    .limit(1);

  return {
    identification,
    catalogMatch: catalogMatch.data?.[0] || null,
    googleVisionData: visionResult, // stored in items.ai_identification jsonb
  };
}
```

---

## 6. Recommendation

### 6.1 The Decision

**Adopt Approach 3D: Hybrid Catalog Model.**

The source of truth for Trésor is a **two-tier model**:

| Tier | Entity | Source of Truth For | Owner |
|---|---|---|---|
| **Product tier** | `catalog_items` | Brand, model, variant, reference number, materials, retail price, market value | Shared (system-managed, AI-seeded, admin-curated) |
| **Ownership tier** | `items` | Condition, photos, purchase price, notes, lending status, privacy | User (owner_id) |

The `catalog_items` table is the "what is this product?" source of truth.  
The `items` table is the "this is MY copy of this product" source of truth.

### 6.2 Why This Approach

| Factor | Manual (3A) | Crowdsourced (3B) | External DB (3C) | **Hybrid (3D)** |
|---|---|---|---|---|
| Development cost | $0 | High (4-6 weeks) | High (scraping infra + legal) | **Medium (2-3 weeks)** |
| Feature enablement | Blocks 6+ brief features | Enables all | Enables most | **Enables all** |
| Privacy | Maximum | Needs careful controls | Exposes data to 3rd parties | **Preserved (catalog = product facts only)** |
| Scale fit (5-15 users) | ✓ | ✗ (overkill) | ✗ (overkill + no APIs) | **✓ (catalog grows organically)** |
| Ongoing cost | $0 | $0 | $100-500/month | **~$2-5/month (AI identification)** |
| UAE market fit | Neutral | Neutral | Poor (US-centric sources) | **Strong (catalog reflects actual circle's items)** |
| AI leverage | Basic | Full | Limited by API availability | **Full (AI seeds and matches catalog)** |

### 6.3 Specific Answers to Nasser's Questions

> **"What is your source of truth here?"**

Two sources of truth:
1. **`catalog_items`** is the source of truth for *what the product is* (brand, model, materials, reference number, market value).
2. **`items`** is the source of truth for *who owns it and in what condition* (owner, condition, photos, purchase price, lending status).

> **"Are we always going to upload everything and store it in the database?"**

Yes — every item is stored in the `items` table with the user's photos and data. But items are now *linked* to a catalog entry that normalizes the product identity. The catalog entry may be shared across multiple users' items.

> **"Is there a process to add items?"**

Yes — three entry paths (unchanged from current design):
1. **AI Photo Add** — photograph → AI identifies → suggests catalog match → user confirms → item created with catalog link
2. **Link Add** — paste URL → parse product info → suggest catalog match → user confirms → item created
3. **Manual Add** — type brand (autocomplete from brands table) + model → search catalog → user confirms match or creates new → item created

In all cases, the system creates or links a `catalog_items` entry automatically. The user doesn't manage the catalog directly — it grows behind the scenes.

> **"Do these items become universal in the database?"**

The **product identity** becomes universal — "Chanel Classic Flap Medium Black Caviar" is one `catalog_items` row that all linked items reference. The **ownership data** (photos, condition, purchase price, notes) remains private to each user, governed by existing RLS policies.

A catalog entry is visible to all authenticated users in the circle (it's just product facts — brand, model, materials). But which users own items linked to that catalog entry is governed by the `items` RLS policies (owner sees own items; circle members see non-private items).

### 6.4 Privacy Model

| Data | Visibility | Mechanism |
|---|---|---|
| `brands` (brand names, logos) | All authenticated users | RLS: `select using (auth.role() = 'authenticated')` |
| `catalog_items` (model, materials, retail price) | All authenticated users | RLS: same |
| `catalog_images` (reference photos) | All authenticated users | RLS: same |
| `items` (owner, condition, photos, purchase price, notes) | Owner + circle members (if not private) | Existing RLS: `items_owner_all` + `items_circle_members_select` with `is_private` filter |
| `price_history` (market prices per catalog model) | All authenticated users | Catalog-level prices are shared; item-level prices are owner-only |
| `item_photos` (user's actual photos) | Owner + circle members (if item not private) | Existing RLS |

**Key privacy guarantee:** A user can add a private item (e.g., a very expensive piece they don't want to share) linked to a catalog entry. Other users can see the catalog entry (it's just "Cartier Love Bracelet Yellow Gold") but cannot see that this user owns one. The catalog entry doesn't reveal ownership.

---

## 7. Implementation Roadmap

### Phase 1: Catalog Schema (Nigel + Mauricio, 1 week)

| Task | Effort |
|---|---|
| Create migration `0008_brand_catalog.sql` with `brands`, `catalog_items`, `catalog_images` tables | 2 hrs |
| Seed `brands` table with ~50 UAE-relevant luxury brands | 1 hr |
| Add `catalog_item_id` and `brand_id` to `items` table | 30 min |
| Add `catalog_item_id` to `price_history` table | 30 min |
| Enable `pg_trgm` extension for fuzzy matching | 15 min |
| RLS policies for catalog tables (read-all-authenticated, write-service-role) | 1 hr |
| Update TypeScript types (`database.types.ts`, `items.ts`) | 1 hr |
| Storage bucket for catalog images | 30 min |

### Phase 2: AI Identification Edge Function (Sonny, 1 week)

| Task | Effort |
|---|---|
| `identify-item` Edge Function: Google Vision + GPT-4o-mini pipeline | 4 hrs |
| Catalog matching logic (fingerprint search, confidence threshold) | 3 hrs |
| Auto-create catalog entry when no match found | 2 hrs |
| Return structured identification + catalog match suggestion to client | 2 hrs |
| Error handling, rate limiting, image size validation | 2 hrs |

### Phase 3: Client Integration (Sonny + Muaath, 1 week)

| Task | Effort |
|---|---|
| Update Add Item flow: AI result → catalog match suggestion UI | 4 hrs |
| Brand autocomplete from `brands` table (manual entry path) | 2 hrs |
| Item detail screen: show catalog info (model, reference number, market price) | 3 hrs |
| Catalog-linked filtering (filter by brand_id instead of free-text brand) | 2 hrs |
| Backfill job: run AI identification on existing unlinked items | 2 hrs |

### Phase 4: Catalog Management (Nigel, 0.5 week, Phase 5+)

| Task | Effort |
|---|---|
| Admin merge UI for duplicate catalog entries | 4 hrs |
| Duplicate detection scheduled job | 2 hrs |
| Catalog item edit UI (admin only — correct wrong data) | 3 hrs |
| Price tracking Edge Function (eBay API per catalog_item_id) | 4 hrs |

**Total: ~3 weeks of development, phased across the existing delivery plan.**

### Integration with Existing Phased Plan

| Brief Phase | Catalog Work |
|---|---|
| Phase 3 (Core Inventory) | Add `catalog_item_id` column, brand autocomplete, manual catalog matching |
| Phase 4 (AI Integration) | Full AI identification → catalog match pipeline, auto-create catalog entries |
| Phase 5 (Circle + Borrow) | Cross-user item matching ("3 members own this bag"), shared catalog display |
| Phase 6 (Wishlist + Price Tracking) | Catalog-level price tracking (eBay API per model), price drop alerts |
| Phase 7 (Polish) | Duplicate detection, admin merge tools, collection insights |

---

## 8. Sources

<a name="source-1"></a>[1] Vestiaire Collective — No public developer API. Scraping via Apify/Scrapfly/custom `__NEXT_DATA__` parser. Source: `research/luxury-recognition-app-research.md` §4, verified August 2026.

<a name="source-2"></a>[2] Chrono24 — No public API for price data. Dealer listing import API (XML/JSON) for sellers only. ChronoPulse market index is web-only. Source: `research/luxury-recognition-app-research.md` §2.B, verified August 2026. Chrono24 homepage: https://www.chrono24.com

<a name="source-3"></a>[3] FarFetch — Public API program shut down. Third-party scrapers (Retailed.io, ScrapingBot, Apify) only. Source: `research/luxury-recognition-app-research.md` §2.D.

<a name="source-4"></a>[4] eBay Browse API — `api.ebay.com`, free with developer account. 5,000 calls/day default. Active listings only (no sold-price data since 2020). Source: `research/luxury-recognition-app-research.md` §2.C. eBay Developer Program: https://developer.ebay.com

<a name="source-5"></a>[5] Scraping legal risk — Vestiaire, FarFetch, Chrono24 Terms of Service prohibit automated scraping. Using scraping APIs (Apify, ScrapingBee) shifts some compliance burden but does not eliminate legal risk. Source: `research/luxury-recognition-app-research.md` Key Risks.

<a name="source-6"></a>[6] DataGats.com — Aggregator covering Net-a-Porter, FarFetch, Harrods, MyTheresa, SSENSE, Luisaviaroma, 90+ brand boutiques, + resale platforms. Custom API/data feed. Contact for pricing. Source: `research/luxury-recognition-app-research.md` §2.G.

<a name="source-7"></a>[7] Google Cloud Vision API Pricing — First 1,000 units/month free. Logo Detection: $1.50/1K (1001-5M), $0.60/1K (5M+). Web Detection: $3.50/1K. Label Detection: $1.50/1K. Source: https://cloud.google.com/vision/pricing (verified August 2026).

<a name="source-8"></a>[8] LLM Vision API Pricing — GPT-4o: $2.50/$10.00 per 1M tokens (input/output), ~$0.0036/image. GPT-4o-mini: $0.15/$0.60 per 1M tokens, ~$0.0002/image. Claude Sonnet 4.6: $3.00/$15.00 per 1M, ~$0.004/image. Gemini 3 Flash: $0.50/$3.00 per 1M, ~$0.0011/image. Source: `research/luxury-recognition-app-research.md` §1, verified August 2026.

<a name="source-9"></a>[9] Luxury Handbag Authentication Market Research — AI-powered image recognition achieves 97.3% accuracy for authentication (vs 85% manual expert). Computer vision identifies counterfeit Chanel at 98.4%, Louis Vuitton at 97.1%, Gucci at 96.8%. AI analyzes stitch density, material weave, hardware plating, leather grain. Source: Dataintelo Luxury Handbag Authentication Market Research Report 2033. https://dataintelo.com/report/luxury-handbag-authentication-market

<a name="source-10"></a>[10] Entrupy Pricing — Petit: $139/mo (25 tokens, $5.60/token). Standard: $599/mo (125 tokens, $4.80/token). Grand: $1,049/mo (250 tokens, $4.20/token). Enterprise: contact sales. Includes MarketEDGE (real-time market value, condition grading). Source: https://www.entrupy.com/pricing (verified August 2026).

<a name="source-11"></a>[11] Real Authentication via Whatnot — $10/item for Basic Authentication with COA (75% off partnership rate). Entrupy via Whatnot: $7/item. Source: Whatnot Help Center, https://help.whatnot.com/hc/en-us/articles/40551460883213

---

## Appendix A: Comparison with Real-World Catalog Architectures

| Platform | Catalog Model | Relevance to Trésor |
|---|---|---|
| **Goodreads** | Universal book catalog. Each "edition" is a catalog entry. Users have "shelves" (copies). 90M+ users, 2.5B books. [[12]](#source-12) | Conceptually identical to our hybrid model. But Goodreads is public and massive — Trésor is private and small. The *pattern* (catalog entry + user copy) is right; the *scale* is different. |
| **Discogs** | Crowdsourced music database. Users contribute releases; community moderates. Each user has a "collection" linked to release entries. | The organic catalog growth model is similar to what we propose. Discogs started empty and grew through user contributions — Trésor's catalog will grow through AI-seeded entries. |
| **Vestiaire Collective** | Marketplace with product catalog. Each listing is a user item; the platform normalizes brand/model for search. No public catalog API. | Vestiaire normalizes at the listing level, not a separate catalog table. Our approach (separate `catalog_items` table) is cleaner for a non-marketplace app. |
| **Rebag (Clair AI)** | Photo → instant brand ID + price quote. Rebag has their own internal catalog built from years of authentication data. | Rebag's Clair AI is the UX reference in the brief. Their catalog is proprietary and built through authentication volume — not replicable for a 15-user app. Our AI-seeded organic catalog achieves a similar UX at tiny scale. |

<a name="source-12"></a>[12] Goodreads — 90M+ members, 2.5B books, 87M reviews. Acquired by Amazon 2013. Source: Goodreads press materials, https://www.goodreads.com/about/us

---

## Appendix B: Match Fingerprint Algorithm

The `match_fingerprint` column on `catalog_items` is a normalized string used for fuzzy matching. It's generated from the identification data:

```typescript
function buildFingerprint(identification: ItemIdentification): string {
  const parts = [
    identification.brand?.toLowerCase().trim(),
    identification.model_name?.toLowerCase().trim(),
    identification.model_variant?.toLowerCase().trim(),
    identification.color?.toLowerCase().trim(),
    identification.material?.toLowerCase().trim(),
  ].filter(Boolean);
  
  // Normalize common variations
  return parts
    .join('|')
    .replace(/gold hardware/g, 'ghw')
    .replace(/palladium hardware/g, 'phw')
    .replace(/\s+/g, ' ')
    .replace(/[^\w| ]/g, '');
}

// Example:
// Input: { brand: "Chanel", model_name: "Classic Flap", model_variant: "Medium", color: "Black", material: "Caviar" }
// Output: "chanel|classic flap|medium|black|caviar"

// Trigram similarity search:
// SELECT * FROM catalog_items 
// WHERE similarity(match_fingerprint, 'chanel|classic flap|medium|black|caviar') > 0.7
// ORDER BY similarity DESC LIMIT 5;
```

The threshold of 0.7 (using PostgreSQL's `pg_trgm` `similarity()` function) balances false positives and false negatives. The user always confirms the match, so false positives are recoverable.

---

*End of document. Questions to Nigel.*
