# Places with Missing or Vague Data

This is a working list of the gaps in `italy.json` and our estimate for each one. Estimates come from the research section below. Hours use the same format as the dataset, and "Daily 0:00-24:00" means always open. Only confirmed values (marked ✅) are applied to `italy-clean.json` so far. The rest become `assumption` corrections when the Hours Status logic is built (build step 3).

Source: `italy.json` as of 2026-11-04. 38 Places have missing or vague hours. 9 Places have no duration, and all 9 also lack hours.

## Missing or vague hours: grouped by why they're missing

The group matters because it decides how we can fill the gap.

### A. Open public spaces (piazzas, fountains, bridges, viewpoints, neighborhoods, parks)

These places probably have no opening hours at all. Treating them as "always accessible" is a reasonable assumption, apart from parks, which may close at night.

| id | Name | Type | City | Duration | Raw hours | Estimate: hours |
|---|---|---|---|---|---|---|
| place_002 | Trastevere Neighborhood | neighborhood | Rome | 180 | — | Daily 0:00-24:00 (open space) |
| place_008 | Piazza Navona | historic_site | Rome | 45 | — | Daily 0:00-24:00 (open space) |
| place_013 | Pigneto Neighborhood | neighborhood | Rome | 120 | — | Daily 0:00-24:00 (open space) |
| place_014 | Aventine Keyhole | viewpoint | Rome | — | — | Daily 0:00-24:00 (open space) |
| place_018 | Trevi Fountain | historic_site | Rome | 30 | — | Daily 9:00-22:00 ✅ confirmed, applied |
| place_019 | Spanish Steps | historic_site | Rome | 20 | — | Daily 0:00-24:00 (open space) |
| place_023 | Piazza del Popolo at Dawn | viewpoint | Rome | — | — | Daily 0:00-24:00 (open space) |
| place_027 | Piazzale Michelangelo | viewpoint | Florence | — | — | Daily 0:00-24:00 (open space) |
| place_028 | Oltrarno Neighborhood | neighborhood | Florence | 180 | — | Daily 0:00-24:00 (open space) |
| place_052 | Piazza Maggiore at Night | viewpoint | Bologna | — | — | Daily 0:00-24:00 (open space) |
| place_057 | Navigli Canals at Aperitivo Hour | neighborhood | Milan | 120 | — | Daily 0:00-24:00 (open space) |
| place_060 | Galleria Vittorio Emanuele II | historic_site | Milan | 45 | — | Daily 0:00-24:00 (arcade; shops ~10:00-19:30) |
| place_066 | Rialto Bridge | historic_site | Venice | — | — | Daily 0:00-24:00 (open space) |
| place_072 | Dorsoduro Neighborhood | neighborhood | Venice | 180 | — | Daily 0:00-24:00 (open space) |
| place_077 | Trevi Fountain by Night | viewpoint | Rome | — | — | Daily 9:00-22:00 (same as place_018) |
| place_080 | Borghese Park (Villa Borghese) | park | Rome | 120 | — | Daily 8:00-19:00 (dawn–dusk; no official hours) |
| place_084 | Ponte Vecchio | historic_site | Florence | 30 | — | Daily 0:00-24:00 (bridge; shops ~10:00-19:00) |
| place_085 | Como Town Lakefront | viewpoint | Como | — | — | Daily 0:00-24:00 (open space) |
| place_093 | Piazza del Duomo, Florence (Exterior) | viewpoint | Florence | — | — | Daily 0:00-24:00 (open space) |
| place_097 | Passeggiata del Gianicolo, Rome | viewpoint | Rome | — | — | Daily 0:00-24:00 (unconfirmed) |
| place_102 | Quadrilatero della Moda, Milan | neighborhood | Milan | 90 | — | Daily 10:00-19:00 (shop hours) |

Several names already say when to go ("at Dawn", "by Night", "at Aperitivo Hour"). That's a suggested time of day, not opening hours.

### B. Self-guided activities and day trips (no single venue)

These have no single operator, so no source will give real opening hours. The useful data is daylight hours plus whether the activity fits in one day.

| id | Name | Type | City | Duration | Raw hours | Estimate: hours |
|---|---|---|---|---|---|---|
| place_021 | Appian Way Bike Ride | experience | Rome | 240 | — | Daily 9:30-17:00 (bike rental; earlier close of two sources) |
| place_035 | Chianti Day Trip by Bike | experience | Florence | 480 | — | Daily 9:00-17:00 (tours start ~9:00, 6–7 h) |
| place_038 | Siena Day Trip | experience | Siena | 360 | — | Daily 8:00-19:00 (daylight window) |
| place_049 | University of Bologna Porticoes Walk | experience | Bologna | 120 | — | Daily 0:00-24:00 (open space) |
| place_063 | Bellagio, Lake Como | experience | Bellagio | 360 | — | Daily 8:00-19:00 (daylight window) |
| place_070 | Burano Island Trip | experience | Burano | 300 | — | Daily 8:00-19:00 (daylight window) |
| place_075 | Early Morning in Cannaregio | experience | Venice | 90 | — | Daily 0:00-24:00 (best early morning) |
| place_089 | Pienza Village Day Trip | experience | Pienza | 360 | — | Daily 8:00-19:00 (daylight window) |
| place_100 | Aperitivo Culture Walk, Milan | experience | Milan | 180 | Evenings | Daily 18:00-23:00 (aperitivo hours) |

### C. Real businesses or events (these could be looked up)

These are the only Places where an external lookup could return real opening hours.

| id | Name | Type | City | Duration | Raw hours | Estimate: hours |
|---|---|---|---|---|---|---|
| place_006 | Campo de' Fiori Market | market | Rome | 60 | Morning only | Mon-Sat 7:00-14:00 |
| place_037 | Aperitivo at Rasputin | cafe | Florence | 90 | Evenings | Tue-Sun 19:30-02:00 (stricter of two sources) |
| place_044 | Traditional Balsamic Vinegar Tasting, Modena | experience | Modena | 90 | — | Daily 9:30-17:30 (Giusti tours 9:30–16:30, 1 h each) |
| place_053 | Cheese and Prosciutto Tour, Parma | experience | Parma | 360 | — | Mon-Fri 8:30-14:30 (morning dairy visit + lunch) |
| place_068 | Cicchetti Bar Crawl, Cannaregio | experience | Venice | 180 | Evenings | Daily 18:00-22:30 (typical bacaro evening hours) |
| place_071 | Gondola on a Back Canal | experience | Venice | 60 | — | Daily 9:00-19:00 (official daytime rate) |
| place_079 | Prosciutto e Melone at Cremeria Mascareta | cafe | Venice | 90 | Evenings | ❌ removed from dataset |
| place_090 | Isola della Scala Risotto Festival | experience | Isola della Scala | 300 | — | Unknown: 17 Sep–13 Oct 2026, daily hours not published |

## Missing duration (9 Places, all open spaces from group A)

| id | Name | Type | City | Estimate: minutes |
|---|---|---|---|---|
| place_014 | Aventine Keyhole | viewpoint | Rome | 15 |
| place_023 | Piazza del Popolo at Dawn | viewpoint | Rome | 30 |
| place_027 | Piazzale Michelangelo | viewpoint | Florence | 45 |
| place_052 | Piazza Maggiore at Night | viewpoint | Bologna | 45 |
| place_066 | Rialto Bridge | historic_site | Venice | 20 |
| place_077 | Trevi Fountain by Night | viewpoint | Rome | 30 |
| place_085 | Como Town Lakefront | viewpoint | Como | 60 |
| place_093 | Piazza del Duomo, Florence (Exterior) | viewpoint | Florence | 30 |
| place_097 | Passeggiata del Gianicolo, Rome | viewpoint | Rome | 60 |

## Hours research (2026-11-05)

Lookups done with an AI web search, so **check each source before trusting a value**. Confidence labels:
- **Official:** from the operator's or the city's own site.
- **Third-party:** from travel guides or aggregators. These are often out of date.
- **Conflicting:** sources disagree. Both versions are shown.
- **Not found:** no hours anywhere.
- **24/7, not searched:** a public street or square with no gate. I didn't look these up, because there are no hours to find.

### A. Open public spaces

| id | Name | Found hours | Confidence | Source |
|---|---|---|---|---|
| place_002 | Trastevere Neighborhood | 24/7 | 24/7, not searched | — |
| place_008 | Piazza Navona | 24/7 | 24/7, not searched | — |
| place_013 | Pigneto Neighborhood | 24/7 | 24/7, not searched | — |
| place_014 | Aventine Keyhole | 24/7 (the keyhole is on a gate facing a public piazza). The garden behind it is by appointment only. Expect queues in daylight. | Third-party, consistent | [Archeoroma](https://www.archeoroma.org/?p=5461), [Holidify](https://www.holidify.com/places/rome/knights-of-malta-keyhole-sightseeing-1268435.html) |
| place_018 | Trevi Fountain | **Changed in 2026.** The piazza is free 24/7. Since 2 Feb 2026 the area next to the basin costs **€2**, roughly 09:00–22:00 (last entry 21:00), and it's free outside those hours. Sources disagree on Mon/Fri opening: 11:00 or 11:30. | Official + news | [Turismo Roma (official)](https://turismoroma.it/en/node/168455), [Wanted in Rome](https://www.wantedinrome.com/news/tourists-in-rome-to-pay-2-to-visit-trevi-fountain.html), [Romewise](https://www.romewise.com/trevi-fountain-tickets.html) |
| place_019 | Spanish Steps | 24/7, free. **Sitting on the steps has been banned since 2019 (fines from €250).** | Third-party + news | [The Points Guy](https://thepointsguy.com/news/sitting-on-spanish-steps-rome-banned), [Japan Times](https://www.japantimes.co.jp/news/2019/08/09/world/rome-bans-sitting-spanish-steps-puzzling-hot-tired-tourists) |
| place_023 | Piazza del Popolo at Dawn | 24/7 | 24/7, not searched | — |
| place_027 | Piazzale Michelangelo | 24/7, free. Only the café and the stalls keep set hours. | Third-party, consistent | [The Better Vacation](https://thebettervacation.com/florence/piazzale-michelangelo/amp/), [Nomado](https://www.nomadotravel.app/en/attractions/piazzale-michelangelo) |
| place_028 | Oltrarno Neighborhood | 24/7 | 24/7, not searched | — |
| place_052 | Piazza Maggiore at Night | 24/7 | 24/7, not searched | — |
| place_057 | Navigli Canals at Aperitivo Hour | 24/7 (public canal-side streets). The bars keep their own hours. | 24/7, not searched | — |
| place_060 | Galleria Vittorio Emanuele II | The arcade is open 24/7 (a public passage). Shops are open about 10:00–19:30. | Third-party, consistent | [Introducing Milan](https://www.introducingmilan.com/galleria-vittorio-emanuele-ii), [Audiala](https://audiala.com/en/italy/milan/galleria-vittorio-emanuele-ii) |
| place_066 | Rialto Bridge | 24/7 | 24/7, not searched | — |
| place_072 | Dorsoduro Neighborhood | 24/7 | 24/7, not searched | — |
| place_077 | Trevi Fountain by Night | Free after about 22:00, when the €2 ticket hours end (see place_018). | Official + news | Same as place_018 |
| place_080 | Borghese Park (Villa Borghese) | The grounds are free year-round; most guides say dawn to dusk. **No official City of Rome page found.** Galleria Borghese (inside the park) is Tue–Sun 09:00–19:00. | Conflicting | [borghese.gallery](https://borghese.gallery/visit/), [Italy Review](https://www.italyreview.com/villa-borghese.html) |
| place_084 | Ponte Vecchio | The bridge is open 24/7. The jewellery shops are open about 10:00–19:00, with shorter Sunday hours. | Third-party, consistent | [ItaliaRail](https://www.italiarail.com/sights/ponte-vecchio), [Vacheron Constantin boutique](https://stores.vacheron-constantin.com/italy/firenze/ponte-vecchio-52/r) |
| place_085 | Como Town Lakefront | 24/7 | 24/7, not searched | — |
| place_093 | Piazza del Duomo, Florence (Exterior) | 24/7 | 24/7, not searched | — |
| place_097 | Passeggiata del Gianicolo, Rome | Probably 24/7 (a public promenade), but **I found no source confirming hours.** A noon cannon fires daily from Piazzale Garibaldi. | Not found (hours) | [The Local (cannon)](https://www.thelocal.it/20240202/why-does-rome-fire-a-cannon-every-day-at-noon) |
| place_102 | Quadrilatero della Moda, Milan | The streets are open 24/7. Shops are open about 10:00–19:00/19:30, and many are also open Sunday (about 11:00–19:30). Hours vary by brand. | Third-party | [Marni Montenapoleone (store page)](https://www.marni.com/wx/stores/marni-milano-montenapoleone), [Italy Review](https://www.italyreview.com/quadrilatero-della-moda.html) |

### B. Self-guided activities and day trips

None of these has an operator, so their real limit is daylight and transport.

| id | Name | Found hours | Confidence | Source |
|---|---|---|---|---|
| place_021 | Appian Way Bike Ride | The road is closed to private traffic on Sundays and holidays, which makes Sunday the best day. Bike rental on weekends and holidays opens at **09:30**, but sources disagree on the close: **17:00 or 19:00**. | Conflicting | [Go City](https://gocity.com/en/rome/attractions/ancient-appia-antica-bike), [Tourist in Rom](https://www.tourist-in-rom.com/en/sunday-in-rome-appia-antica/) |
| place_035 | Chianti Day Trip by Bike | Guided tours from Florence start at **08:30–09:30** and last about 6–7 hours. One runs April–October, daily. | Third-party | [Europe Express](https://www.europeexpress.com/sightseeing/small-group-tour-from-florence-to-chianti-by-e-bike-ride-through-vineyards-hills/), [Travelocity listing](https://www.travelocity.com/things-to-do/tuscany-by-e-bike-from-florence.a512295.activity-details) |
| place_038 | Siena Day Trip | Not searched. The town is open; the limit is train/bus times. | Not found | — |
| place_049 | University of Bologna Porticoes Walk | 24/7 (public covered walkways). | 24/7, not searched | — |
| place_063 | Bellagio, Lake Como | The town is open year-round. Ferries from Como also run year-round but **with fewer boats in winter**. No current 2026–27 winter timetable found. | Third-party | [Navigazione Laghi (official notices)](https://www.navigazionelaghi.it/en/notices), [Lake Como Travel](https://lakecomotravel.com/boat-tours-ferry-lake-como/) |
| place_070 | Burano Island Trip | Vaporetto line 12 runs about every 30 min from Fondamente Nove, all day. **No confirmed first or last boat.** One unverified source says about 04:20–22:25, plus the night line N. | Third-party, unverified | [Visit Venice Italy (line 12)](https://visit-venice-italy.com/water-bus-venice-line-12.html), [tickets-venice timetable](https://www.tickets-venice.com/venice-water-bus-tickets/timetable) |
| place_075 | Early Morning in Cannaregio | 24/7 (a neighbourhood). The name suggests early morning. | 24/7, not searched | — |
| place_089 | Pienza Village Day Trip | Not searched. The town is open; the limit is transport, as it's best reached by car. | Not found | — |
| place_100 | Aperitivo Culture Walk, Milan | The streets are open 24/7. Aperitivo bars usually run from about 18:00. | 24/7, not searched | — |

### C. Real businesses and events

| id | Name | Found hours | Confidence | Source |
|---|---|---|---|---|
| place_006 | Campo de' Fiori Market | **Mon–Sat, about 07:00–14:00, closed Sunday.** Opening is given as 06:00, 07:00 or 08:00 depending on the source. | Third-party, mostly consistent | [Time Out Rome](https://www.timeout.com/rome/things-to-do/best-markets-in-rome), [Turismo Roma (official listing, no hours)](https://www.turismoroma.it/en/places/mercato-rionale-regola-i-campo-de-fiori) |
| place_037 | Aperitivo at Rasputin | **19:00–02:00.** Sources disagree on days: daily, or Tue–Sun with Monday closed. ⚠️ **Data mismatch:** the real Rasputin (Borgo Tegolaio 21R) is a speakeasy cocktail bar that **needs a reservation**. It isn't a "ramshackle bar with a free aperitivo spread". `booking_required: false` and `€` look wrong. | Conflicting | [Mes Prestiges (checked May 2026)](https://mesprestiges.com/en/firenze/places/rasputin), [En Primeur Club](https://www.enprimeurclub.com/guide/best-cocktail-bars-in-florence) |
| place_044 | Traditional Balsamic Vinegar Tasting, Modena | **Acetaia Giusti:** open daily, free 1-hour tours at 09:30, 10:50, 12:00, 14:00, 15:15 and 16:30. **Acetaia Malpighi:** by reservation, Mon–Fri about 09:30–18:30, weekends for groups of 10 or more. No public transport to either. | Third-party | [Lonely Planet (Giusti)](https://www.lonelyplanet.com/points-of-interest/acetaia-giusti/1616425), [Visit Modena (Malpighi)](https://www.visitmodena.it/en/discover-modena/land-of-flavors/the-vinegar-factories/malpighi-vinegar-farm) |
| place_053 | Cheese and Prosciutto Tour, Parma | Cheese-making visits start at **07:30–09:00**, because the cheese is only made in the morning. This matches the dataset's seasonal note ("weekday mornings only"). | Third-party, consistent | [Emilia Delizia](https://www.emiliadelizia.com/best-parmesan-parmigiano-reggiano-dairies-to-visit-in-parma-in-2025/), [Ciao Italy Tours](https://ciaoitalytours.rezgo.com/page_details?com=357266) |
| place_068 | Cicchetti Bar Crawl, Cannaregio | Not a single venue. Bacari usually open about 10:00–15:00 and 18:00–22:30, and many close Sunday or Monday. The evening window to plan around is roughly **18:00–22:30**. | Third-party (pattern) | [Cantina Do Spade](https://venicexplorer.com/the-city/navigate-venice/bars/cantina-do-spade), [Tablejourney (bacari)](https://tablejourney.com/italy/venice/street-food/) |
| place_071 | Gondola on a Back Canal | No official timetable is published. The official daytime rate applies **09:00–19:00** (about €90 for 30 min), and a higher night rate applies 19:00–04:00. | Third-party | [Gondola board (gondolavenezia.it)](https://www.gondolavenezia.it), [Mom in Italy](https://mominitaly.com/gondola-ride-in-venice/) |
| place_079 | Prosciutto e Melone at Cremeria Mascareta | **No "Cremeria Mascareta" exists.** The description (a Castello wine bar run by a sommelier, open until 2am) matches **Enoteca Mascareta**, Calle Lunga Santa Maria Formosa 5183. Its hours: most listings say daily **19:00–02:00**, and one gives different hours for each day. ⚠️ The name looks wrong. | Conflicting | [Tablejourney](https://tablejourney.com/italy/venice/wine-bars/enoteca-mascareta/), [Afar](https://www.afar.com/places/enoiteca-mascareta-sestiere) |
| place_090 | Isola della Scala Risotto Festival | **The 2026 edition runs 17 Sep – 13 Oct**, open every day. Daily hours are not published. | Official (dates only) | [Regione Veneto](https://www.regione.veneto.it/article-detail?articleId=14411822), [SiViaggia](https://siviaggia.it/notizie/sagre-feste-veneto-ottobre-2026/602735/) |

### Data problems found while researching

These go beyond missing hours. Status as of 2026-11-05:
1. ✅ **Removed.** **place_079:** the name ("Cremeria", "Prosciutto e Melone") doesn't match the description, which is Enoteca Mascareta, a wine bar.
2. ✅ **`booking_required` corrected to true.** **place_037:** the real Rasputin needs a reservation and is a cocktail speakeasy, so `booking_required: false` and `€` are doubtful.
3. ✅ **Hours corrected to Daily 9:00-22:00. The price stays €.** **place_018 / 077 Trevi:** the €2 basin ticket since Feb 2026 isn't in the data. It's walk-up, so `booking_required: false` still holds.
4. ✅ **Seasonal note corrected.** **place_063 Bellagio:** the seasonal note says "Open April–October only". The town is open all year; only the ferry service shrinks in winter.
5. Kept as-is (your decision). **place_090:** the seasonal note says "October only", but the 2026 festival starts 17 September.
