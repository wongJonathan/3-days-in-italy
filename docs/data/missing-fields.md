# Places with Missing or Vague Data

This is a working list of the gaps we still need to estimate. The **Estimate** columns are blank on purpose and get filled in once we agree how to estimate each one. In `italy-clean.json` these fields stay empty until an estimate is approved here.

Source: `italy.json` as of 2026-11-04. 38 Places have missing or vague hours. 9 Places have no duration, and all 9 also lack hours.

## Missing or vague hours: grouped by why they're missing

The group matters because it decides how we can fill the gap.

### A. Open public spaces (piazzas, fountains, bridges, viewpoints, neighborhoods, parks)

These places probably have no opening hours at all. Treating them as "always accessible" is a reasonable assumption, apart from parks, which may close at night.

| id | Name | Type | City | Duration | Raw hours | Estimate: hours |
|---|---|---|---|---|---|---|
| place_002 | Trastevere Neighborhood | neighborhood | Rome | 180 | — | |
| place_008 | Piazza Navona | historic_site | Rome | 45 | — | |
| place_013 | Pigneto Neighborhood | neighborhood | Rome | 120 | — | |
| place_014 | Aventine Keyhole | viewpoint | Rome | — | — | |
| place_018 | Trevi Fountain | historic_site | Rome | 30 | — | |
| place_019 | Spanish Steps | historic_site | Rome | 20 | — | |
| place_023 | Piazza del Popolo at Dawn | viewpoint | Rome | — | — | |
| place_027 | Piazzale Michelangelo | viewpoint | Florence | — | — | |
| place_028 | Oltrarno Neighborhood | neighborhood | Florence | 180 | — | |
| place_052 | Piazza Maggiore at Night | viewpoint | Bologna | — | — | |
| place_057 | Navigli Canals at Aperitivo Hour | neighborhood | Milan | 120 | — | |
| place_060 | Galleria Vittorio Emanuele II | historic_site | Milan | 45 | — | |
| place_066 | Rialto Bridge | historic_site | Venice | — | — | |
| place_072 | Dorsoduro Neighborhood | neighborhood | Venice | 180 | — | |
| place_077 | Trevi Fountain by Night | viewpoint | Rome | — | — | |
| place_080 | Borghese Park (Villa Borghese) | park | Rome | 120 | — | |
| place_084 | Ponte Vecchio | historic_site | Florence | 30 | — | |
| place_085 | Como Town Lakefront | viewpoint | Como | — | — | |
| place_093 | Piazza del Duomo, Florence (Exterior) | viewpoint | Florence | — | — | |
| place_097 | Passeggiata del Gianicolo, Rome | viewpoint | Rome | — | — | |
| place_102 | Quadrilatero della Moda, Milan | neighborhood | Milan | 90 | — | |

Several names already say when to go ("at Dawn", "by Night", "at Aperitivo Hour"). That's a suggested time of day, not opening hours.

### B. Self-guided activities and day trips (no single venue)

These have no single operator, so no source will give real opening hours. The useful data is daylight hours plus whether the activity fits in one day.

| id | Name | Type | City | Duration | Raw hours | Estimate: hours |
|---|---|---|---|---|---|---|
| place_021 | Appian Way Bike Ride | experience | Rome | 240 | — | |
| place_035 | Chianti Day Trip by Bike | experience | Florence | 480 | — | |
| place_038 | Siena Day Trip | experience | Siena | 360 | — | |
| place_049 | University of Bologna Porticoes Walk | experience | Bologna | 120 | — | |
| place_063 | Bellagio, Lake Como | experience | Bellagio | 360 | — | |
| place_070 | Burano Island Trip | experience | Burano | 300 | — | |
| place_075 | Early Morning in Cannaregio | experience | Venice | 90 | — | |
| place_089 | Pienza Village Day Trip | experience | Pienza | 360 | — | |
| place_100 | Aperitivo Culture Walk, Milan | experience | Milan | 180 | Evenings | |

### C. Real businesses or events (these could be looked up)

These are the only Places where an external lookup could return real opening hours.

| id | Name | Type | City | Duration | Raw hours | Estimate: hours |
|---|---|---|---|---|---|---|
| place_006 | Campo de' Fiori Market | market | Rome | 60 | Morning only | |
| place_037 | Aperitivo at Rasputin | cafe | Florence | 90 | Evenings | |
| place_044 | Traditional Balsamic Vinegar Tasting, Modena | experience | Modena | 90 | — | |
| place_053 | Cheese and Prosciutto Tour, Parma | experience | Parma | 360 | — | |
| place_068 | Cicchetti Bar Crawl, Cannaregio | experience | Venice | 180 | Evenings | |
| place_071 | Gondola on a Back Canal | experience | Venice | 60 | — | |
| place_079 | Prosciutto e Melone at Cremeria Mascareta | cafe | Venice | 90 | Evenings | |
| place_090 | Isola della Scala Risotto Festival | experience | Isola della Scala | 300 | — | |

## Missing duration (9 Places, all open spaces from group A)

| id | Name | Type | City | Estimate: minutes |
|---|---|---|---|---|
| place_014 | Aventine Keyhole | viewpoint | Rome | |
| place_023 | Piazza del Popolo at Dawn | viewpoint | Rome | |
| place_027 | Piazzale Michelangelo | viewpoint | Florence | |
| place_052 | Piazza Maggiore at Night | viewpoint | Bologna | |
| place_066 | Rialto Bridge | historic_site | Venice | |
| place_077 | Trevi Fountain by Night | viewpoint | Rome | |
| place_085 | Como Town Lakefront | viewpoint | Como | |
| place_093 | Piazza del Duomo, Florence (Exterior) | viewpoint | Florence | |
| place_097 | Passeggiata del Gianicolo, Rome | viewpoint | Rome | |
