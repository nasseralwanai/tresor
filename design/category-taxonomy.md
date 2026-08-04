# Trésor — Luxury Item Category Taxonomy

## Research Methodology

Categories compiled from browsing the navigation menus and product taxonomies of:
- **Chanel** (chanel.com) — Fashion, Fine Jewelry, Watches, Eyewear, Fragrance, Makeup, Skincare
- **Hermès** (hermes.com) — Handbags, Small Leather Goods, Silk, Shoes, Jewelry, Watches, Home
- **Louis Vuitton** (louisvuitton.com) — Bags, Small Leather Goods, Travel, Accessories, Fashion Jewelry, Ready-to-Wear, Shoes
- **Net-a-Porter** (net-a-porter.com) — Clothing, Bags, Shoes, Jewelry, Accessories, Lingerie, Beauty, Lifestyle
- **FarFetch** (farfetch.com) — Clothing, Bags, Shoes, Accessories, Jewelry (Womenswear/Menswear/Kidswear)
- **SSENSE** (ssense.com) — Bags, Shoes, Clothing, Accessories, Jewelry
- **Mytheresa** (mytheresa.com) — Ready-to-Wear, Shoes, Bags, Accessories, Fine Jewelry, Lifestyle

Cross-referenced with Bloomingdale's, Neiman Marcus, and PurseBlog for subcategory granularity.

---

## Primary Categories

The app should use these top-level categories for filtering and navigation. Each is chosen because it maps directly to how luxury retailers organize their own catalogs and because the AI photo recognition (GPT-4o Vision) can reliably distinguish them.

### 1. Handbags
The single most valuable category in personal luxury collections. Sub-types are by silhouette/structure.

| Subcategory | Description | Example |
|---|---|---|
| Flap Bags | Fold-over flap closure; the iconic Chanel style | Chanel Classic Flap, Chanel 2.55 Reissue |
| Tote Bags | Open-top, structured, large capacity | LV Neverfull, Saint Laurent Shopper |
| Shoulder Bags | Worn on shoulder, medium-large | Hermès Garden Party, Bottega Veneta Arco |
| Crossbody Bags | Long strap, worn across body | Chanel Boy, Dior Saddle, Gucci Marmont |
| Clutches & Evening Bags | Hand-held, no strap (or detachable) | Saint Laurent Envelope, Judith Leiber |
| Top Handle Bags | Rigid handle, structured carry | Hermès Birkin, Hermès Kelly, Lady Dior |
| Satchels | Structured, double-handled, briefcase-adjacent | Goyard Saint Louis, LV Capucines |
| Hobo Bags | Slouchy, crescent silhouette | Chanel Hobo, Bottega Veneta Cassette |
| Bucket Bags | Drawstring or open, cylindrical | LV Noé, Mansur Gavriel Bucket |
| Backpacks | Two straps, hands-free | LV Palm Springs, Prada Re-Nylon Backpack |
| Mini & Micro Bags | Novelty small sizes; collectible | Chanel Mini Rectangular, Jacquemus Le Chiquito |
| Wallet-on-Chain (WOC) | Small bag + chain strap; wallet hybrid | Chanel WOC, Saint Laurent Loulou WOC |
| Travel & Weekender Bags | Large capacity for travel | LV Keepall, Goyard Saint Louis Tote, Hermès Bolide Voyage |
| Belt Bags / Fanny Packs | Worn around waist or crossbody | LV Multi Pochette, Gucci Ophidia Belt Bag |

### 2. Jewelry
Split into Fine Jewelry (precious metals + gemstones) and Fashion/Costume Jewelry (non-precious materials). The app should track this distinction because it affects valuation methodology.

#### 2a. Fine Jewelry
| Subcategory | Description | Example |
|---|---|---|
| Rings | Including engagement, cocktail, eternity, signet | Cartier Love Ring, Van Cleef & Arpels Perlée |
| Necklaces & Pendants | Chains, pendants, sautoirs | Cartier Juste un Clou Necklace, Tiffany HardWear |
| Bracelets | Bangles, cuffs, tennis bracelets, charm | Cartier Love Bracelet, Van Cleef Alhambra |
| Earrings | Studs, drops, hoops, chandeliers | Van Cleef & Arpels Clover Earrings, Buccellati |
| Brooches & Pins | Decorative, collectible | Chanel Fine Jewelry Brooch, Heritage pieces |
| Body Jewelry | Belly chains, anklets, body chains | High jewelry body pieces |
| Bridal / Engagement | Engagement rings, wedding bands | Cartier, Tiffany & Co., Harry Winston |

#### 2b. Fashion / Costume Jewelry
| Subcategory | Description | Example |
|---|---|---|
| Statement Necklaces | Bold, non-precious materials | Chanel Costume Jewelry, Dior Tribales |
| Bracelets & Bangles | Non-precious, decorative | Chanel CC Logo Bangle, Gucci costume |
| Earrings | Costume studs, drops, clip-ons | Chanel Double C Earrings, Dior Tribales |
| Rings | Costume, logo-driven | Chanel CC Ring, Saint Laurent logo ring |
| Brooches & Pins | Costume, vintage collectibles | Vintage Chanel brooches, Schiaparelli |

### 3. Watches
A distinct category from jewelry — different market, different collectors, different valuation models (Chrono24, WatchCharts).

| Subcategory | Description | Example |
|---|---|---|
| Dress Watches | Slim, elegant, leather strap | Cartier Tank, Patek Philippe Calatrava, Jaeger-LeCoultre Reverso |
| Sports / Luxury Sport | Integrated bracelet, robust | Rolex Submariner, AP Royal Oak, Patek Nautilus |
| Chronographs | Stopwatch complication | Rolex Daytona, Omega Speedmaster |
| Diving Watches | High water resistance, rotating bezel | Rolex Submariner, Omega Seamaster |
| GMT / Dual Time | Multiple timezone tracking | Rolex GMT-Master II, Patek Travel Time |
| Perpetual Calendar | High complication | Patek Philippe Perpetual Calendar, AP Royal Oak Perpetual |
| Pilot / Aviator | Aviation-inspired | IWC Pilot, Breitling Navitimer |
| Field Watches | Military-inspired, utilitarian | Heritage pieces, Hamilton Khaki Field |
| Smart / Hybrid | Luxury smartwatches | Apple Watch Hermès, Tag Heuer Connected |
| Fashion Watches | Designer-branded, quartz/mechanical | Chanel J12, Louis Vuitton Tambour, Hermès Heure H |

### 4. Shoes
Organized by silhouette/structure, consistent with Net-a-Porter and FarFetch taxonomy.

| Subcategory | Description | Example |
|---|---|---|
| Heels & Pumps | Classic pumps, stilettos, kitten heels | Christian Louboutin Pigalle, Manolo Blahnik Hangisi |
| Sandals | Strappy, flat or heeled | Hermès Oran Sandals, Chanel Two-Tone Sandals |
| Ballet Flats | Flat, round-toe, slip-on | Chanel Ballet Flats, Repetto Cendrillon |
| Sneakers | Luxury and designer sneakers | Chanel Dad Sneakers, Golden Goose, Common Projects |
| Boots | Ankle, knee-high, over-the-knee | Saint Laurent Paris Boots, Celine Cowboy Boots |
| Loafers & Moccasins | Slip-on, structured | Gucci Horsebit Loafer, Prada Loafers |
| Mules & Slides | Backless, slip-on | Bottega Veneta Mules, Gucci Princetown |
| Espadrilles & Wedges | Platform/wedge sole | Castañer Espadrilles, Chanel Espadrilles |
| Evening Shoes | Formal, embellished | Rene Caovilla, Sophia Webster |
| Slippers | Indoor, luxury house slippers | Hermès Achilles Slippers, Gucci Princetown Slippers |

### 5. Clothing (Ready-to-Wear)
Clothing is lower priority for a luxury item inventory focused on bags/jewelry/watches, but circles may include high-value designer clothing.

| Subcategory | Description |
|---|---|
| Outerwear | Coats, jackets, blazers, trench coats |
| Dresses | Day dresses, evening gowns, cocktail dresses |
| Tops & Blouses | Blouses, shirts, knit tops |
| Knitwear | Sweaters, cardigans, cashmere |
| Skirts | Pencil, A-line, midi, maxi |
| Pants & Trousers | Tailored trousers, jeans, shorts |
| Suits & Tailoring | Blazers, suit sets, tuxedos |
| Swimwear | Bikinis, one-pieces, resort wear |
| Lingerie & Intimates | Luxury lingerie, loungewear |
| Activewear | Designer athleisure |

### 6. Accessories (Non-Jewelry)
Catch-all for non-jewelry, non-bag accessories that carry brand value.

| Subcategory | Description | Example |
|---|---|---|
| Sunglasses & Eyewear | Designer sunglasses, optical frames | Chanel Sunglasses, Dior Sunglasses, Tom Ford |
| Scarves & Wraps | Silk scarves, twill, cashmere, pashmina | Hermès Carré 90, Burberry Silk Scarf |
| Belts | Leather, chain, logo belts | Gucci Belt, Hermès H Belt, Chanel Chain Belt |
| Hats & Headwear | Fedoras, straw hats, beanies, berets | Eugenia Kim, Maison Michel |
| Gloves | Leather, cashmere | Hermès Gloves, Chanel Leather Gloves |
| Small Leather Goods | Wallets, cardholders, coin purses, key holders | Hermès Constance Wallet, Chanel Cardholder |
| Travel Accessories | Luggage tags, passport covers, travel wallets | LV Passport Cover, Goyard Saint Louis |
| Ties & Pocket Squares | Men's luxury ties, bow ties | Hermès Tie, Drake's Pocket Square |
| Umbrellas | Luxury designer umbrellas | Burberry, Hermès |
| Keychains & Bag Charms | Bag accessories, key fobs | LV Bag Charm, Fendi Bag Bug |
| Tech Accessories | Phone cases, AirPods cases, laptop sleeves | LV iPhone Case, Gucci tech accessories |
| Fans | Folding fans, collectibles | Hermès Fans, vintage Dior fans |

### 7. Fragrance & Beauty
Lower priority but some circles may track collectible fragrance bottles.

| Subcategory | Description |
|---|---|
| Perfume & Cologne | Full-size and travel fragrances |
| Collectible Bottles | Limited edition, vintage bottles |
| Makeup | Luxury cosmetics, palettes |
| Skincare | High-end skincare |

### 8. Home & Lifestyle
Emerging category at Mytheresa (Life), Net-a-Porter (Lifestyle). Lower priority.

| Subcategory | Description | Example |
|---|---|---|
| Candles & Home Fragrance | Luxury scented candles | Diptyque, Cire Trudon, Fornasetti |
| Books & Stationery | Coffee table books, notebooks | Assouline, Taschen, Hermès Stationery |
| Tableware & Dining | Plates, glassware, cutlery | Ginori 1735, Venini, Hermès Tableware |
| Textiles & Throws | Blankets, pillows, cashmere throws | Missoni Home, Loro Piana Throws |
| Decorative Objects | Vases, sculptures, objets d'art | Fornasetti, Lalique, Daum |

---

## Recommended App Category Structure

For the Trésor app, the primary navigation/filter categories should be the 6 core categories from the brief, with the above subcategories available as filter refinements:

```
Primary Filters (horizontal chips):
  All | Handbags | Jewelry | Shoes | Watches | Clothing | Accessories

Subcategory Filters (in filter bottom sheet, under each primary):
  Handbags → Flap Bags, Totes, Shoulder, Crossbody, Clutches, Top Handle,
              Satchels, Hobo, Bucket, Backpacks, Mini & Micro, WOC,
              Travel, Belt Bags
  Jewelry → Fine: Rings, Necklaces, Bracelets, Earrings, Brooches, Bridal
            Fashion: Necklaces, Bracelets, Earrings, Rings, Brooches
  Shoes → Heels & Pumps, Sandals, Ballet Flats, Sneakers, Boots,
          Loafers, Mules & Slides, Espadrilles, Evening, Slippers
  Watches → Dress, Sports/Luxury Sport, Chronograph, Diving, GMT,
            Perpetual Calendar, Pilot, Field, Smart, Fashion
  Clothing → Outerwear, Dresses, Tops, Knitwear, Skirts, Pants,
             Suits, Swimwear, Lingerie, Activewear
  Accessories → Sunglasses, Scarves, Belts, Hats, Gloves, Small Leather Goods,
                Travel Accessories, Ties, Umbrellas, Keychains, Tech, Fans
```

## Material/Finish Tags (cross-cutting)

In addition to category, items should be taggable with materials — critical for luxury valuation and search:

- **Leathers:** Lambskin, Caviar, Togo, Epsom, Box Calf, Ostrich, Alligator, Crocodile, Lizard, Python
- **Metals:** Gold (yellow/rose/white), Palladium, Silver, Platinum, Gunmetal
- **Hardware:** Gold Hardware (GHW), Palladium Hardware (PHW), Silver Hardware (SHW), Ruthenium
- **Gemstones:** Diamond, Sapphire, Ruby, Emerald, Pearl, Onyx, Turquoise
- **Fabrics:** Silk, Cashmere, Wool, Tweed, Canvas, Denim, Lace
- **Exotic:** Alligator, Crocodile, Ostrich, Lizard, Python, Stingray, Pony Hair

## Condition Grades

For valuation and filtering:

| Grade | Description |
|---|---|
| Pristine | Like new, no visible wear, original packaging |
| Excellent | Minimal wear, no significant flaws |
| Very Good | Light wear consistent with age; minor scratches/scuffs |
| Good | Visible wear; may need minor restoration |
| Fair | Significant wear; functional but shows age |
| Vintage | 15+ years old; condition assessed relative to age |

---

## Sources

- Chanel.com navigation: Handbags (Flap, Hobo, Shopping & Bowling, Bucket, Backpacks, Evening, Mini), Fine Jewelry (Rings, Bracelets, Earrings, Necklaces, Brooches, Bridal), Watches (Fine Watchmaking), Eyewear, Ready-to-Wear
- Hermès.com: Handbags (Birkin, Kelly, Constance, Lindy, Garden Party, Evelyne, Picotin, Bolide, Jypsiere, Herbag, 24/24, Verrou, Geta, Roulis, Steeple), Small Leather Goods, Silk, Shoes, Jewelry, Watches, Home
- LouisVuitton.com sitemap: Bags, Small Leather Goods, Travel, Accessories, Fashion Jewelry, Ready-to-Wear, Shoes
- Net-a-Porter: Clothing, Bags, Shoes, Jewelry, Accessories, Lingerie, Beauty, Lifestyle
- FarFetch: Clothing, Bags, Shoes, Accessories (Womenswear/Menswear/Kidswear)
- SSENSE: Bags (clutches, shoulder, duffles, messenger, satchels), Shoes, Clothing, Accessories
- Mytheresa: Ready-to-Wear, Shoes, Bags, Accessories, Fine Jewelry, Lifestyle (Life)
- Bloomingdale's shoe categories: Ballet Flats, Boots, Evening & Occasion, Heels, Flats, Loafers, Mules & Clogs, Platforms, Pumps, Sandals, Slippers, Sneakers, Wedges
- Neiman Marcus scarf categories: Silk Twill, Cashmere, Wool, Modal-Cashmere, Poncho, Foulard, Chiffon
- PurseBlog Hermès bag guide: Birkin, Kelly, Constance, Lindy, Garden Party, Jypsiere, Evelyne, Bolide, Picotin
