# Luxury Item Recognition App — AI Capabilities Research

**Date:** August 2026  
**Target:** iOS-first React Native app; cloud APIs only  
**Core features:** photo identification, price tracking, URL import, voice search

---

## 1. Vision API — Best for Identifying Luxury Brands from Photos

### Recommendation: Two-tier approach (Google Cloud Vision + GPT-4o/Gemini)

No single API is optimal alone. A **hybrid pipeline** gives the best accuracy-to-cost ratio.

#### Tier 1 — Google Cloud Vision API (Logo Detection + Web Detection)

| Feature | Detail |
|---|---|
| **Logo Detection** | Recognizes popular product logos; returns brand + confidence score + bounding polygon. |
| **Web Detection** | Finds visually similar images + pages across the web (excellent for "what is this bag?" lookups). |
| **Pricing** | First 1,000 units/month FREE. Then **$1.50 per 1,000 units** (logo), **$3.50 per 1,000** (web detection). Volume tier drops to $0.60–$1.00/1K at 5M+ requests. |
| **Integration** | REST API or official client libraries (Node.js, Python). Direct image bytes or GCS URI. |
| **Strength** | Cheap, fast, structured JSON output. Good for known logo brands (Gucci, LV, Hermès, etc.). |
| **Limitation** | Only detects *logos it has been trained on*. Won't identify a bag model from shape/stitching alone. Won't work on unbranded luxury items. |

```js
// Example: Node.js
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const client = new ImageAnnotatorClient();
const [result] = await client.annotateImage({
  image: { content: base64Image },
  features: [
    { type: 'LOGO_DETECTION', maxResults: 10 },
    { type: 'WEB_DETECTION', maxResults: 10 },
    { type: 'LABEL_DETECTION', maxResults: 10 },
  ],
});
```

#### Tier 2 — LLM Vision (GPT-4o or Gemini 2.5/3 Flash) for semantic identification

When logo detection fails or returns low confidence (e.g., no visible logo, an unusual angle, a rare model), pass the image to a multimodal LLM to reason about the item.

| Provider | Model | Input Price | Output Price | Image Cost (approx.) | Notes |
|---|---|---|---|---|---|
| **OpenAI** | GPT-4o | $2.50/1M tok | $10.00/1M tok | ~$0.0036 per image (512×512) | Strongest general brand/model reasoning. Best at naming specific models ("Hermès Birkin 30 Togo Gold"). |
| **OpenAI** | GPT-4o-mini | $0.15/1M tok | $0.60/1M tok | ~$0.0002 per image | **Best value.** Vision-capable. Use for high-volume first pass. |
| **OpenAI** | GPT-4.1 | $2.00/1M tok | $8.00/1M tok | — | Newer, 1M context, good for multi-image comparison. |
| **Anthropic** | Claude Sonnet 4.6 | $3.00/1M tok | $15.00/1M tok | ~$0.004 per 1000×1000 image | Excellent visual reasoning + detail extraction. 1M context window. Good at materials/colors/hardware. |
| **Anthropic** | Claude Haiku 4.5 | $1.00/1M tok | $5.00/1M tok | ~$0.0003 per image | Budget Claude option, strong vision. |
| **Google** | Gemini 3 Flash | $0.50/1M tok | $3.00/1M tok | $0.0011 per image (560 tokens) | **Cheapest capable vision LLM.** Free tier exists in Google AI Studio. |
| **Google** | Gemini 3.1 Pro | $1.25–$2.00/1M tok | $10.00/1M tok | — | Strongest Google multimodal. 2M context. |

**Recommended choice:** **GPT-4o-mini for first-pass identification** (cost ~$0.0002/image) → escalate to **GPT-4o or Claude Sonnet 4.6** for low-confidence cases. This keeps cost under $0.01 per user photo in most cases.

#### Tier 3 — Specialized Fashion Vision APIs (optional, higher accuracy but higher cost/complexity)

| Provider | Capability | Pricing | Notes |
|---|---|---|---|
| **ViSenze** (now Rezolve AI) | Visual search, similar-product recommendation, automated product tagging. Combines image search with text filters. | Enterprise/custom (per-image or monthly license). Contact sales. | Best-in-class for fashion visual search. Used by Myntra, Urban Outfitters. Would require indexing your own catalog. |
| **Syte.ai** | Visual search API for fashion. Users upload photos → find similar products. White-label, integrates in <1 day. | Monthly license based on image-match volume. Contact sales. | Strong for "find similar items" feature. Clients include M&S, Kohl's. |
| **api4ai Brand Recognition** | Dedicated brand/logo recognition API. | Pay-per-use, lower cost than Google Vision. | Good supplement; rated highly for accuracy. |
| **Clarifai / Hive.ai / Visua** | General logo + object detection. | Various; Clarifai has free tier. | Backup options for logo detection. |

**Verdict on specialized APIs:** These are powerful but designed for retailers with their own product catalogs to index. For a consumer app that identifies *any* luxury item, the Google Vision + LLM hybrid is more flexible and cheaper to start. Consider ViSenze/Syte if you later build a "find similar items to buy" feature.

---

## 2. Price Tracking APIs for Luxury Items

### Summary: No single API covers all luxury verticals. Combine 2–3 sources.

#### A. StockX (Sneakers, Streetwear, Watches, Handbags)

| Aspect | Detail |
|---|---|
| **Official API** | `developer.stockx.com` — requires approval. OAuth 2.0. Offers Catalog Search, Listing, and Order Management APIs. |
| **Access** | Must request developer access; approval is selective. No published pricing (revenue-share / partnership model for marketplace APIs). |
| **Data available** | Product catalog, market stats (bid/ask), price history, sales data. |
| **Best for** | Sneakers, hyped streetwear, watches, some handbags. Real-time market pricing. |
| **Alternative** | Third-party scrapers (ScrapingBee StockX scraper: $49–$99/mo for 250K–1M credits). Unofficial `stockx-api` npm package exists but fragile. |

#### B. Chrono24 (Watches)

| Aspect | Detail |
|---|---|
| **Official API** | No public developer API for price data. Chrono24 offers a **dealer listing import API/feed** (XML/JSON) for *sellers* to push listings, not for pulling market data. |
| **ChronoPulse** | Free market index tool on their website, built on real transaction data. No API access — web-only. |
| **Alternative** | Scraping via ScrapingBee/Apify (Apify Chrono24 scraper: pay-per-usage). Python wrapper `chrono24` on PyPI (unofficial, scrapes search results). |
| **Best for** | Luxury watches (Rolex, Patek Philippe, AP, etc.). 3.7M+ tracked timepieces. |

#### C. eBay Browse API (All luxury categories)

| Aspect | Detail |
|---|---|
| **Official API** | `api.ebay.com` — Browse API (search, get items), Finding API (legacy). Free to use with eBay developer account + App ID. |
| **Data available** | Active listing prices, item details, seller info. **Historical/sold prices were removed from API in 2020** (controversial). |
| **Rate limits** | 5,000 calls/day default; can request increases. |
| **Best for** | Broad coverage — watches, bags, jewelry, shoes. Largest secondary market. |
| **Limitation** | No sold-price data via API anymore. Must scrape eBay sold listings (gray area). |

#### D. FarFetch (Luxury Fashion — Retail Prices)

| Aspect | Detail |
|---|---|
| **Official API** | **No public developer API.** FarFetch shut down their public API program. |
| **Alternative** | Third-party scrapers: Retailed.io FarFetch API (50 free credits, then paid), ScrapingBot FarFetch scraper, Apify actors. DataGats.com offers structured luxury data extraction. |
| **Data available** | Product name, brand, price, currency, images, category, sizes, availability. |
| **Best for** | Current retail prices on new luxury fashion (bags, shoes, clothing). |

#### E. Vestiaire Collective (Luxury Resale)

| Aspect | Detail |
|---|---|
| **Official API** | **No public developer API.** |
| **Alternative** | Scraping via Apify (Vestiaire Collective Scraper — pay per event) or Scrapfly (tutorial + Python code available). Vestiaire uses Next.js; hidden `__NEXT_DATA__` JSON can be parsed. |
| **Data available** | Brand, condition, price, seller info, authentication status, photos, product details. |
| **Best for** | Pre-owned luxury resale prices (bags, clothing, shoes, watches). 5M+ listings. |

#### F. The RealReal (Luxury Resale — US)

| Aspect | Detail |
|---|---|
| **Official API** | No public API. |
| **Alternative** | Scraping (Apify actors, custom scrapers). |
| **Best for** | US luxury resale market, authenticated items. |

#### G. Aggregated Data Providers (Recommended for breadth)

| Provider | Coverage | Pricing | Notes |
|---|---|---|---|
| **DataGats.com** | Net-a-Porter, FarFetch, Harrods, MyTheresa, SSENSE, Luisaviaroma, 90+ brand boutiques, + resale (Vestiaire, StockX, TheRealReal) | Custom quote | Full luxury market intelligence: pricing, trends, MAP violations. Best single source for broad coverage. |
| **Retailed.io** | FarFetch, StockX, others | 50 free credits → paid plans | Product-level data via REST API. |
| **Apify** | Chrono24, Vestiaire, FarFetch, StockX scrapers | Pay per usage (actor-dependent) | Marketplace of scrapers; flexible but you manage orchestration. |
| **ScrapingBee** | Any site (StockX, Chrono24, etc.) | $49–$99/mo (250K–1M credits) | Generic scraping API with JS rendering + proxy rotation. |

### Recommended Price Tracking Stack

| Priority | Source | Method | Category |
|---|---|---|---|
| 1 | **eBay Browse API** | Official API (free) | All categories, active listings |
| 2 | **StockX API** | Official (if approved) or ScrapingBee | Sneakers, watches, hyped items |
| 3 | **Vestiaire Collective** | Apify scraper or custom (Next.js `__NEXT_DATA__`) | Resale bags/clothing/shoes |
| 4 | **FarFetch** | Retailed.io API or ScrapingBot | Retail fashion prices |
| 5 | **Chrono24** | Apify scraper or `chrono24` PyPI package | Watches |

**Cost estimate:** eBay (free) + Apify scrapers (~$49–$99/mo) + ScrapingBee ($49/mo) = **~$100–$150/month** for a starting price-tracking backend covering all major sources.

---

## 3. Link Parsing — Extracting Product Info from URLs

### The Technical Landscape

Luxury e-commerce sites use varying levels of structured data. There is **no universal API**; you parse what's available.

#### Method A: Structured Data Extraction (JSON-LD / Microdata) — Best First Attempt

Most major luxury retailers embed **Schema.org `Product` markup** as JSON-LD in their HTML. This is the cleanest, most reliable extraction method.

**Sites with JSON-LD Product data:**
- ✅ Net-a-Porter / Mr Porter
- ✅ FarFetch
- ✅ SSENSE
- ✅ MyTheresa
- ✅ Luisaviaroma
- ✅ Most Shopify-based brand boutiques

**Fields typically available:** name, brand, image, price, currency, availability, description, SKU, color, size.

```js
// Extract JSON-LD from any product page
const html = await fetch(url).then(r => r.text());
const $ = cheerio.load(html);
const jsonLd = $('script[type="application/ld+json"]').toArray()
  .map(el => JSON.parse($(el).html()))
  .flat()
  .find(obj => obj['@type'] === 'Product' || 
               (Array.isArray(obj['@type']) && obj['@type'].includes('Product')));

// jsonLd now has: name, brand.name, image[], offers.price, offers.priceCurrency, etc.
```

#### Method B: Open Graph + Meta Tags (Fallback)

Even sites without full JSON-LD usually have Open Graph tags:
```html
<meta property="og:title" content="Chanel Classic Flap Bag">
<meta property="og:image" content="https://...">
<meta property="product:price:amount" content="8500">
<meta property="product:price:currency" content="USD">
```

#### Method C: Hidden Next.js / React State (For JS-heavy sites)

Sites like Vestiaire Collective embed product data in `__NEXT_DATA__` script tags:
```js
const nextData = JSON.parse($('#__NEXT_DATA__').html());
const product = nextData.props.pageProps.product; // Full product object
```

FarFetch embeds data in `window.__INITIAL_STATE__` or similar React hydration objects.

#### Method D: LLM-Assisted Extraction (Universal Fallback)

For sites where structured data is missing or incomplete, **pass the page HTML/text to an LLM** (GPT-4o-mini at $0.15/$0.60 per 1M tokens) with a prompt to extract structured product fields:

```js
const prompt = `Extract luxury product info from this page text. Return JSON:
{ brand, model, category, price, currency, image_url, description, sku, color, material }
\n\n${pageText}`;
// Send to GPT-4o-mini — cost: ~$0.001 per page
```

#### Site-Specific Notes

| Site | Best Method | Difficulty | Notes |
|---|---|---|---|
| **Chanel.com** | HTML parsing + LLM fallback | Hard | Minimal structured data. Heavy JS. No JSON-LD on many pages. LLM extraction recommended. |
| **Net-a-Porter** | JSON-LD | Easy | Clean Schema.org Product markup. |
| **FarFetch** | `__INITIAL_STATE__` JSON or Retailed.io API | Medium | JS-rendered. Data in hydration state. |
| **SSENSE** | JSON-LD | Easy | Good structured data. SSENSE API also available via Parse.bot. |
| **MyTheresa** | JSON-LD | Easy | Standard Schema.org markup. |
| **Vestiaire Collective** | `__NEXT_DATA__` JSON | Medium | Next.js app; parse embedded JSON. |
| **Gucci.com** | HTML + meta tags + LLM | Medium | Some JSON-LD; inconsistent. |
| **Hermès.com** | HTML parsing + LLM | Hard | Minimal structured data. |
| **LV.com (Louis Vuitton)** | HTML + meta tags | Medium | Some product meta tags. |

### Recommended Link Parsing Architecture

```
User pastes URL
    ↓
1. Fetch HTML (server-side, with headless browser if needed)
    ↓
2. Try JSON-LD extraction (cheerio) → 70% of cases resolved
    ↓
3. Try Open Graph / meta tags → +15% more
    ↓
4. Try __NEXT_DATA__ / __INITIAL_STATE__ → +5% more
    ↓
5. Fallback: LLM extraction (GPT-4o-mini on page text) → +10% more
    ↓
6. Return structured product object
```

**Libraries:** `cheerio` (HTML parsing), `schema-dts` (TypeScript types for Schema.org), `playwright` or `puppeteer` (for JS-rendered pages).

---

## 4. Existing Luxury Item Databases / APIs

### Lyst

| Aspect | Detail |
|---|---|
| **What it is** | Aggregator of 17,000+ brands across 500+ retailers. Processes millions of products/day into one catalog. |
| **API** | **No public API.** Lyst has an engineering blog and GitHub org but no open developer API. |
| **Access** | Scraping services exist (DataGats, others) but no official channel. |
| **Best for** | Price comparison across retailers, trend data. Would be the ideal data source if an API existed. |

### Vestiaire Collective

| Aspect | Detail |
|---|---|
| **What it is** | Global luxury resale platform. 5M+ items. B-Corp certified. Active in 70+ countries. |
| **API** | **No public API.** |
| **Access** | Scraping (Apify, Scrapfly, custom). Hidden `__NEXT_DATA__` JSON. |
| **Unique value** | Authentication data, condition grading, resale price trends. BCG partnership for market data. |

### The RealReal

| Aspect | Detail |
|---|---|
| **API** | No public API. |
| **Access** | Scraping only. |
| **Unique value** | US's largest authenticated luxury resale. Good for US price benchmarks. |

### SSENSE

| Aspect | Detail |
|---|---|
| **API** | Available via **Parse.bot** marketplace (third-party). Exposes product listings, detailed product data, designer/brand catalogs, real-time SKU-level inventory. |
| **Access** | Parse.bot API (paid). |
| **Best for** | Contemporary designer fashion pricing. |

### DataGats.com (Aggregator)

| Aspect | Detail |
|---|---|
| **Coverage** | Net-a-Porter, FarFetch, Harrods, MyTheresa, SSENSE, Luisaviaroma, 90+ brand boutiques, + resale platforms. |
| **Data** | Product details, pricing, discounts, descriptions, brand, category, materials, images, availability, resale price benchmarking. |
| **Access** | Custom API/data feed. Contact for pricing. |
| **Best for** | One-stop luxury market intelligence if budget allows. |

### Other Notable Databases

| Source | Type | Access | Notes |
|---|---|---|---|
| **Google Shopping** | Price comparison | Google Shopping Content API (for merchants); scraping for consumers | Broad but not luxury-specialized. |
| **Amazon Product Advertising API** | General retail | Free with Associate account | Limited luxury coverage; mostly marketplace sellers. |
| **Entrupy** | Authentication database | Enterprise/B2B | AI authentication for luxury bags — not a price DB but could validate authenticity. |
| **Digital Product Passports (DPPs)** | Emerging standard | N/A (emerging) | EU regulation driving product data standards. Vestiaire/BCG report highlights DPPs as key for authentication (70% of buyers value them). Future data source. |

### Verdict

**There is no single "luxury item database API" you can plug into.** The market is fragmented and most platforms (Lyst, Vestiaire, FarFetch, Chrono24) do not offer public APIs. Your options are:

1. **Build your own database** by scraping/aggregating from multiple sources (Apify + ScrapingBee + eBay API).
2. **License data** from an aggregator like DataGats.com (covers 90+ sources).
3. **Use eBay API** as the free baseline and layer scraped sources on top.

---

## 5. Voice Features — Describing an Item Verbally for AI to Find It

### Yes, this is fully feasible. Here's the architecture:

```
User speaks: "I'm looking for a black quilted Chanel flap bag with gold hardware"
    ↓
1. Speech-to-Text (STT)
    ↓
2. LLM parses transcript → structured query (brand, color, material, hardware, category)
    ↓
3. Search your product database / scraped catalog / eBay API / Google Shopping
    ↓
4. Return matching items with images + prices
```

### Component Recommendations

#### A. Speech-to-Text (STT)

| Option | Pricing | Quality | Notes |
|---|---|---|---|
| **OpenAI Whisper API** | $0.006/minute (~$0.36/hour) | Excellent, multilingual | Best quality-to-price. `whisper-1` model. |
| **OpenAI gpt-4o-transcribe** | $0.006/minute | Enhanced accuracy | Newer, better for noisy audio. |
| **OpenAI gpt-4o-mini-transcribe** | $0.003/minute | Good, budget | Half the cost. |
| **Apple SFSpeechRecognizer** | Free (on-device) | Good | **Best for iOS-first app.** No API cost. Built into iOS. Privacy-preserving. |
| **Google Cloud Speech-to-Text** | $0.024/15s (standard) | Very good | More expensive than OpenAI. |
| **Azure Speech Services** | $1/audio hour | Very good | Good multi-language support. |

**Recommendation for iOS-first:** Use **Apple's native SFSpeechRecognizer** (free, on-device) for voice input. Fall back to **OpenAI Whisper** ($0.006/min) if you need server-side processing or higher accuracy for short clips. A 10-second voice description costs ~$0.001 with Whisper.

#### B. Natural Language Understanding (NLU) — Parse the Description

Use an LLM to convert the transcript into a structured search query:

```js
const prompt = `Extract luxury item search parameters from this description.
Return JSON: { brand, category, color, material, hardware, model_keywords, price_max, condition }
If a field isn't mentioned, set it to null.

Description: "${transcript}"`;
// Send to GPT-4o-mini — cost: ~$0.0001 per query
```

**Example:**
- Input: "Black quilted Chanel flap bag with gold hardware under 10 thousand"
- Output: `{"brand":"Chanel","category":"bag","color":"black","material":"quilted","hardware":"gold","model_keywords":["flap"],"price_max":10000}`

#### C. Product Matching / Search

Once you have structured query parameters, search across:
1. Your own scraped product database (SQL/full-text search or vector embeddings).
2. eBay Browse API (keyword search with category filters).
3. Google Vision Web Detection (reverse image search if user also provides a photo).
4. Optional: **ViSenze or Syte** for visual similarity search if you index a product catalog.

#### D. Conversational Refinement (Optional Advanced Feature)

Use a conversational LLM (GPT-4o or Claude) to let users refine via follow-up voice commands:
- "Show me the medium size instead"
- "What about pre-owned options?"
- "Filter to under $5,000"

This requires maintaining conversation state and re-querying your product database.

### Cost Estimate for Voice Feature

| Component | Cost per voice search |
|---|---|
| STT (Apple SFSpeechRecognizer) | $0.00 (free, on-device) |
| STT (OpenAI Whisper fallback) | ~$0.001 (10s audio) |
| LLM query parsing (GPT-4o-mini) | ~$0.0001 |
| Product search (your DB) | ~$0 (infra cost) |
| eBay API call | $0 (free tier) |
| **Total per voice search** | **~$0.001** (with Whisper) or **$0.0001** (Apple STT only) |

Voice search is **extremely cheap** to implement. The main cost is building/maintaining the product database to search against.

---

## Summary: Recommended API Stack

| Feature | Primary Solution | Cost | Backup/Alternative |
|---|---|---|---|
| **Brand ID from photo** | Google Cloud Vision (logo + web detection) | $1.50/1K images (1K free/mo) | api4ai Brand Recognition |
| **Model/detail ID from photo** | GPT-4o-mini (first pass) → GPT-4o (escalation) | $0.0002–$0.004 per image | Claude Sonnet 4.6, Gemini 3 Flash |
| **Price tracking — watches** | Chrono24 scraper (Apify) | ~$49/mo | `chrono24` PyPI package |
| **Price tracking — sneakers/streetwear** | StockX API (if approved) | TBD (partnership) | ScrapingBee StockX scraper ($49/mo) |
| **Price tracking — resale fashion** | Vestiaire scraper (Apify/Scrapfly) | ~$49/mo | Custom `__NEXT_DATA__` scraper |
| **Price tracking — retail fashion** | FarFetch via Retailed.io API | Paid (credits) | ScrapingBot, DataGats |
| **Price tracking — broad/US** | eBay Browse API | FREE | — |
| **URL parsing** | JSON-LD extraction (cheerio) → LLM fallback (GPT-4o-mini) | ~$0.001/page | Playwright for JS-rendered pages |
| **Luxury database** | Build your own (scrape + eBay) + optionally license DataGats | $100–$150/mo (scraping infra) | SSENSE via Parse.bot |
| **Voice input (STT)** | Apple SFSpeechRecognizer (on-device, free) | $0 | OpenAI Whisper ($0.006/min) |
| **Voice → search query** | GPT-4o-mini (NLU parsing) | ~$0.0001/query | Claude Haiku 4.5 |
| **Voice → product match** | Your DB + eBay API + Google Vision Web | $0 (infra) | ViSenze/Syte (enterprise) |

### Monthly Cost Estimate (Early Stage, ~1,000 active users)

| Component | Est. Monthly Cost |
|---|---|
| Google Cloud Vision (10K images) | ~$14 |
| OpenAI GPT-4o-mini (10K vision + 5K text) | ~$5 |
| OpenAI GPT-4o (2K escalation) | ~$20 |
| eBay API | $0 |
| Apify scrapers (Vestiaire + Chrono24 + FarFetch) | ~$100 |
| ScrapingBee (StockX) | ~$49 |
| OpenAI Whisper (1K voice searches × 10s) | ~$1 |
| OpenAI GPT-4o-mini (NLU for voice + URL parsing) | ~$2 |
| **Total** | **~$190/month** |

### Integration Architecture (React Native / iOS)

```
React Native App
    ├── Camera/Photo Upload → Google Vision API → GPT-4o-mini → Brand + Model ID
    ├── URL Paste → Server-side fetch + JSON-LD parse → (fallback) GPT-4o-mini
    ├── Voice Input → Apple SFSpeechRecognizer → GPT-4o-mini (NLU) → Product Search
    ├── Price Tracking → Backend cron (eBay API + Apify scrapers) → PostgreSQL
    └── Backend: Node.js/Express or Python/FastAPI
        ├── PostgreSQL (product DB, price history)
        ├── Redis (caching, rate limiting)
        ├── Bull/BullMQ (scraping job queues)
        └── Deploy: Vercel/Render/AWS
```

---

## Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Scraping legal risk** (Vestiaire, FarFetch ToS) | Prefer official APIs where available. Use scraping APIs (Apify/ScrapingBee) that handle compliance. Cache aggressively to minimize request volume. Consult lawyer on ToS/copyright. |
| **LLM hallucination** (confidently wrong brand/model) | Always cross-reference LLM output with Google Vision logo detection. Show confidence scores to users. Let users confirm/correct. |
| **StockX API approval denied** | Have ScrapingBee/unofficial scraper as fallback. |
| **Scraping breaks when sites change** | Use multiple data sources. Monitor scraper health. Prefer JSON-LD/structured data over CSS selectors (more stable). |
| **Chanel/Hermès block scraping** | Use LLM-assisted extraction from page text. These brands have minimal e-commerce APIs by design. |
| **Cost spikes at scale** | Cache vision results (same image = same ID). Use GPT-4o-mini for 90%+ of cases. Only escalate to GPT-4o when needed. |

---

*Research compiled from OpenAI, Google Cloud, Anthropic, eBay, StockX, Chrono24, Apify, ScrapingBee, Retailed.io, DataGats, ViSenze, Syte, and industry reports (BCG/Vestiaire 2025). Pricing verified August 2026.*
