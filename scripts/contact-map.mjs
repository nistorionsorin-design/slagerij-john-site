// Contact map (stage 8, lexicon §5.23): draws the self-hosted map picture of /contact from an OpenStreetMap export
// (Overpass `out geom`, ODbL — the page carries „© OpenStreetMap-bijdragers”). Run by hand, never at build time:
//   node scripts/contact-map.mjs "../assets/raw/2026-10-09-osm/zwevezele-bruggestraat.json"
// Writes two PNG sources into src/assets/contact/ (Astro makes the AVIF / WebP at build):
//   kaart-zwevezele.png        phone, 5:3, 3 × the board's 350 × 210 box
//   kaart-zwevezele-breed.png  desktop, 5:4, 2 × a 760 × 608 box
// The look is the site's paper palette (tokens.css), no labels (the address box on the page names the street), the
// shop's own building (OSM: Bruggestraat 146A) and the pin in oxblood. Coordinates are metres from the FACTS Maps pin
// 51.0409757, 3.2185005.
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/contact-map.mjs <overpass-export.json>');
const osm = JSON.parse(readFileSync(src, 'utf8'));
const out = fileURLToPath(new URL('../src/assets/contact/', import.meta.url));
mkdirSync(out, { recursive: true });

const PIN = { lat: 51.0409757, lon: 3.2185005 };
const C = {
  land: '#EADFC9', // --tag (the board's map ground)
  resi: '#E7DBC3',
  work: '#E3D5BB',
  green: '#DDD8BA',
  wood: '#D3CFAE',
  farm: '#E4DDC2',
  water: '#C6D1CD',
  park: '#E2D5BE',
  bld: '#D9CCB5',
  bldLine: '#CBBDA3',
  casing: '#D0C1A5',
  road: '#FBF7EE', // --card
  path: '#C4B497',
  ox: '#7B2420',
  paper: '#F4EDE0',
};

// local metres around the pin (equirectangular is exact enough for 1 km)
const kx = 111320 * Math.cos((PIN.lat * Math.PI) / 180);
const ky = 110540;
const m = (p) => [(p.lon - PIN.lon) * kx, (PIN.lat - p.lat) * ky];

const kind = (t) => {
  if (t.building) return 'building';
  if (t.highway) return 'hw';
  if (t.waterway) return 'waterway';
  if (t.natural === 'water' || t.landuse === 'basin' || t.leisure === 'swimming_pool') return 'water';
  if (t.amenity === 'parking') return 'parking';
  if (['forest'].includes(t.landuse) || t.natural === 'wood') return 'wood';
  if (['grass', 'meadow', 'greenfield', 'village_green', 'recreation_ground', 'cemetery'].includes(t.landuse) || ['park', 'playground', 'pitch', 'garden'].includes(t.leisure) || ['scrub', 'grassland', 'heath'].includes(t.natural)) return 'green';
  if (['farmland', 'farmyard', 'orchard', 'plant_nursery', 'allotments'].includes(t.landuse)) return 'farm';
  if (t.landuse === 'residential') return 'resi';
  if (['commercial', 'retail', 'industrial', 'brownfield', 'construction'].includes(t.landuse)) return 'work';
  return null;
};

const ways = osm.elements.filter((e) => e.type === 'way' && e.geometry && e.tags).map((e) => ({ t: e.tags, k: kind(e.tags), pts: e.geometry.map(m) }));

// the shop's building: the one OSM tags Bruggestraat 146A (09.10: its centre is 6,5 m west of the FACTS pin, which
// falls on the outline of no. 148 — Google's pin and OSM's footprints differ by a few metres). The pin's tip goes to
// its centre, and that point sits at (px, py) of each frame.
const shop = ways.find((w) => w.k === 'building' && w.t['addr:street'] === 'Bruggestraat' && w.t['addr:housenumber'] === '146A');
if (!shop) throw new Error('no building tagged Bruggestraat 146A in the export');
const ring = shop.pts.slice(0, -1);
const door = ring.reduce((a, p) => [a[0] + p[0] / ring.length, a[1] + p[1] / ring.length], [0, 0]);
console.log(`shop building: ${JSON.stringify(shop.t)}, centre ${door.map((v) => v.toFixed(1)).join(' / ')} m from the pin`);

/** one map: w × h px at `scale` px per css px, `across` metres wide, the pin at (px, py) as fractions of the frame */
function svg({ w, h, scale, across, px, py, road }) {
  const s = w / across; // px per metre
  const ox = w * px - door[0] * s;
  const oy = h * py - door[1] * s;
  const P = (pts) => pts.map(([x, y]) => `${(ox + x * s).toFixed(1)},${(oy + y * s).toFixed(1)}`).join(' ');
  const poly = (k, fill, extra = '') =>
    ways.filter((x) => x.k === k && x !== shop).map((x) => `<polygon points="${P(x.pts)}" fill="${fill}" ${extra}/>`).join('');
  const hw = (types) => ways.filter((x) => x.k === 'hw' && types.includes(x.t.highway) && x.t.area !== 'yes');
  const line = (list, color, width, extra = '') =>
    list.map((x) => `<polyline points="${P(x.pts)}" fill="none" stroke="${color}" stroke-width="${(width * scale).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`).join('');

  const major = hw(['primary', 'secondary', 'tertiary']);
  const minor = hw(['residential', 'unclassified', 'living_street', 'pedestrian']);
  const service = hw(['service', 'track']);
  const paths = hw(['footway', 'path', 'cycleway', 'steps']);
  const water = ways.filter((x) => x.k === 'waterway');

  // the pin: an oxblood disc (44 css px, the board's) with a paper ring and the Lucide map-pin, on a short stem whose
  // tip is the shop's door
  const tx = ox + door[0] * s;
  const ty = oy + door[1] * s;
  const r = 22 * scale;
  const cx = tx;
  const cy = ty - 34 * scale;
  const icon = `<g transform="translate(${cx - 10 * scale},${cy - 10 * scale}) scale(${(20 / 24) * scale})" fill="none" stroke="${C.paper}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${C.land}"/>
${poly('farm', C.farm)}${poly('resi', C.resi)}${poly('work', C.work)}${poly('green', C.green)}${poly('wood', C.wood)}${poly('parking', C.park)}${poly('water', C.water)}
${line(water, C.water, 2.5)}
${poly('building', C.bld, `stroke="${C.bldLine}" stroke-width="${(0.6 * scale).toFixed(1)}"`)}
${line(paths, C.path, 1, `stroke-dasharray="${2 * scale} ${2.5 * scale}"`)}
${line(service, C.casing, 3.4)}${line(minor, C.casing, road.minor + 1.6)}${line(major, C.casing, road.major + 2)}
${line(service, C.road, 2)}${line(minor, C.road, road.minor)}${line(major, C.road, road.major)}
${shop ? `<polygon points="${P(shop.pts)}" fill="${C.ox}" stroke="${C.ox}" stroke-width="${scale}" stroke-linejoin="round"/>` : ''}
<line x1="${cx}" y1="${cy + r - 2 * scale}" x2="${tx}" y2="${ty}" stroke="${C.ox}" stroke-width="${3 * scale}" stroke-linecap="round"/>
<circle cx="${tx}" cy="${ty}" r="${3.5 * scale}" fill="${C.ox}" stroke="${C.paper}" stroke-width="${1.5 * scale}"/>
<circle cx="${cx}" cy="${cy + 2 * scale}" r="${r + 2 * scale}" fill="#1A1511" opacity=".14"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.ox}" stroke="${C.paper}" stroke-width="${3 * scale}"/>
${icon}
</svg>`;
}

const maps = [
  // phone: the board's 350 × 210 box (5:3), ≈ 640 m across; the pin above the address box that covers the lower third
  { file: 'kaart-zwevezele.png', w: 1050, h: 630, scale: 3, across: 640, px: 0.5, py: 0.5, road: { major: 9, minor: 5.5 } },
  // desktop: 5:4, ≈ 900 m across; the address box sits bottom-left
  { file: 'kaart-zwevezele-breed.png', w: 1520, h: 1216, scale: 2, across: 900, px: 0.56, py: 0.46, road: { major: 9, minor: 5 } },
];
for (const map of maps) {
  const info = await sharp(Buffer.from(svg(map))).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(out + map.file);
  console.log(`${map.file}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(1)} kB`);
}
