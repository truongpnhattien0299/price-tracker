// Builds public/map/{light,dark}.json from OpenFreeMap's "Liberty" style
// (vendored as liberty.json) — plans/08 §0.
//
// Liberty is kept for its layer structure (OpenMapTiles schema, sprite, glyphs);
// every colour comes from the palettes below, tuned to read like Google Maps
// while staying quiet enough that the photo pins are the loudest thing.
//
//   node scripts/map-style/build.mjs
//
// Edit the palettes here, not the generated JSON: both themes share one layer list.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, "../../public/map")

const palettes = {
  light: {
    land: "#f5f3f0",
    residential: "#f0ede8",
    park: "#cdeacb",
    wood: "#d3eccb",
    grass: "#dcefd2",
    pitch: "#d5ead0",
    cemetery: "#dde7d4",
    hospital: "#fbe5e7",
    school: "#f1ede3",
    sand: "#f5eed6",
    ice: "#eef4f6",
    water: "#aadaff",
    waterLine: "#a3d3fa",
    aeroway: "#e9e8ec",
    runway: "#ffffff",
    building: "#e9e6e2",
    buildingLine: "#dcd8d3",
    building3d: "#e4e1dc",
    motorway: "#fdd77e",
    motorwayCasing: "#e5b552",
    trunk: "#fde293",
    trunkCasing: "#efc860",
    major: "#ffffff",
    majorCasing: "#d6d2cb",
    minor: "#ffffff",
    minorCasing: "#e2ded8",
    path: "#d5d1ca",
    rail: "#c3bfb9",
    boundary: "#b8b1a6",
    country: "#8f8a84",
    roadText: "#5f6368",
    placeText: "#3c4043",
    minorPlaceText: "#5f6368",
    poiText: "#6b6f73",
    waterText: "#4a7fb5",
    transitText: "#2f6aa5",
    halo: "#ffffff",
    iconOpacity: 0.9,
    patternOpacity: 1,
    light: "#ffffff",
  },
  dark: {
    land: "#1d2126",
    residential: "#20252a",
    park: "#1d3527",
    wood: "#1e3428",
    grass: "#1f3328",
    pitch: "#203629",
    cemetery: "#222c26",
    hospital: "#33262a",
    school: "#2a2a27",
    sand: "#2c2a23",
    ice: "#262c31",
    water: "#132c44",
    waterLine: "#1a3a58",
    aeroway: "#272b31",
    runway: "#363b42",
    building: "#272b31",
    buildingLine: "#30353b",
    building3d: "#2b3036",
    motorway: "#7a6431",
    motorwayCasing: "#5a4a26",
    trunk: "#665a35",
    trunkCasing: "#4d4429",
    major: "#3b4047",
    majorCasing: "#2a2e34",
    minor: "#33383e",
    minorCasing: "#262a30",
    path: "#3a3f46",
    rail: "#4b5057",
    boundary: "#4e535a",
    country: "#6d7279",
    roadText: "#a9afb5",
    placeText: "#dadde0",
    minorPlaceText: "#b3b8bd",
    poiText: "#9aa0a6",
    waterText: "#6e9cc8",
    transitText: "#7fb0de",
    halo: "#1d2126",
    iconOpacity: 0.75,
    // The sprite's pedestrian-area hatching is drawn for light maps.
    patternOpacity: 0.12,
    light: "#6b7178",
  },
}

// Vietnamese name when the tile has one, else the Latin-script name (the
// local name inside Vietnam, a transliteration for a shop signed only in
// Chinese or Korean). Liberty prefers name_en, which shows "Ho Chi Minh City" /
// "Saigon River" instead of the names users know.
const NAME = ["coalesce", ["get", "name:vi"], ["get", "name:latin"], ["get", "name"]]

// POIs worth showing early in an expense diary: where people buy things.
// Everything else waits until z17, so the map stays quieter than Google's.
const SHOPPING_POI = [
  "shop",
  "grocery",
  "bakery",
  "butcher",
  "alcohol_shop",
  "clothing_store",
  "restaurant",
  "fast_food",
  "cafe",
  "bar",
  "beer",
  "ice_cream",
]
const isShopping = ["match", ["get", "class"], SHOPPING_POI, true, false]

// Layers dropped outright: Natural Earth hillshading looks dated next to
// Google's flat style, and the dotted park outline is noise.
const DROP = new Set(["natural_earth", "park_outline", "road_shield_us", "highway-shield-us-interstate"])

function byClass(trunk, other) {
  return ["match", ["get", "class"], "trunk", trunk, other]
}

/** Line colour for a road layer, from its id: casing vs fill, road class. */
function roadColor(id, p) {
  const casing = id.endsWith("_casing")
  if (/rail/.test(id)) return p.rail
  if (/path_pedestrian/.test(id)) return casing ? p.minorCasing : p.path
  if (/motorway/.test(id)) return casing ? p.motorwayCasing : p.motorway
  if (/trunk_primary/.test(id)) return casing ? byClass(p.trunkCasing, p.majorCasing) : byClass(p.trunk, p.major)
  if (/secondary_tertiary/.test(id)) return casing ? p.majorCasing : p.major
  if (/_link/.test(id)) return casing ? p.majorCasing : p.major
  return casing ? p.minorCasing : p.minor
}

const FILL = {
  background: (p) => ({ "background-color": p.land }),
  park: (p) => ({ "fill-color": p.park, "fill-opacity": 1 }),
  landuse_residential: (p) => ({ "fill-color": p.residential }),
  landcover_wood: (p) => ({ "fill-color": p.wood, "fill-opacity": 0.8 }),
  landcover_grass: (p) => ({ "fill-color": p.grass, "fill-opacity": 0.8 }),
  landcover_ice: (p) => ({ "fill-color": p.ice, "fill-opacity": 0.8 }),
  landuse_pitch: (p) => ({ "fill-color": p.pitch }),
  landuse_track: (p) => ({ "fill-color": p.pitch }),
  landuse_cemetery: (p) => ({ "fill-color": p.cemetery }),
  landuse_hospital: (p) => ({ "fill-color": p.hospital }),
  landuse_school: (p) => ({ "fill-color": p.school }),
  water: (p) => ({ "fill-color": p.water }),
  road_area_pattern: (p) => ({ "fill-opacity": p.patternOpacity }),
  landcover_sand: (p) => ({ "fill-color": p.sand }),
  aeroway_fill: (p) => ({ "fill-color": p.aeroway, "fill-opacity": 1 }),
  building: (p) => ({ "fill-color": p.building, "fill-outline-color": p.buildingLine }),
  "building-3d": (p) => ({ "fill-extrusion-color": p.building3d, "fill-extrusion-opacity": 0.7 }),
}

function textPaint(color, p, width = 1.5) {
  return { "text-color": color, "text-halo-color": p.halo, "text-halo-width": width, "text-halo-blur": 0.5 }
}

function themeLayer(layer, p) {
  const { id, type } = layer
  const paint = { ...layer.paint }
  const layout = { ...layer.layout }
  let filter = layer.filter

  if (FILL[id]) Object.assign(paint, FILL[id](p))
  else if (type === "line" && /^waterway/.test(id)) paint["line-color"] = p.waterLine
  else if (id === "aeroway_runway" || id === "aeroway_taxiway") paint["line-color"] = p.runway
  else if (id === "boundary_2" || id === "boundary_disputed") paint["line-color"] = p.country
  else if (id === "boundary_3") paint["line-color"] = p.boundary
  else if (type === "line" && layer["source-layer"] === "transportation") {
    paint["line-color"] = roadColor(id, p)
    if (id.startsWith("tunnel_")) paint["line-opacity"] = 0.6
  }

  if (type === "symbol") {
    if (layout["text-field"] && !id.startsWith("highway-shield")) layout["text-field"] = NAME
    if (layout["icon-image"]) paint["icon-opacity"] = p.iconOpacity
    if (id.startsWith("highway-name")) Object.assign(paint, textPaint(p.roadText, p))
    else if (id.startsWith("water")) Object.assign(paint, textPaint(p.waterText, p, 1.2))
    else if (id === "poi_transit") Object.assign(paint, textPaint(p.transitText, p, 1.2))
    else if (id.startsWith("poi_") || id === "airport") Object.assign(paint, textPaint(p.poiText, p, 1.2))
    else if (/^label_(city|country|state)/.test(id)) Object.assign(paint, textPaint(p.placeText, p))
    else if (id.startsWith("label_")) Object.assign(paint, textPaint(p.minorPlaceText, p))
    if (id === "label_other") layout["text-font"] = ["Noto Sans Regular"]

    // Ranked POI layers keep only shopping places; the rest move to poi_other (z17).
    if (/^poi_r\d+$/.test(id)) filter = ["all", filter, isShopping]
  }

  return { ...layer, filter, layout, paint }
}

// Google hides neighbourhood names and bus stops until you are close; so do we.
// Each split keeps one layer as-is (`near` classes moved out) and adds a
// zoomed-in copy for those classes.
const SPLITS = {
  label_other: { id: "label_neighbourhood", minzoom: 15.5, classes: ["neighbourhood", "hamlet", "isolated_dwelling"] },
  poi_transit: { id: "poi_bus", minzoom: 16.5, classes: ["bus"] },
}

function build(base, p) {
  const layers = []
  for (const layer of base.layers) {
    if (DROP.has(layer.id)) continue
    const themed = themeLayer(layer, p)
    const split = SPLITS[layer.id]
    if (split) {
      const near = ["match", ["get", "class"], split.classes, true, false]
      themed.filter = ["all", themed.filter, ["!", near]]
      layers.push(themed, { ...themed, id: split.id, minzoom: split.minzoom, filter: ["all", layer.filter, near] })
      continue
    }
    if (themed.filter == null) delete themed.filter
    layers.push(themed)
    if (layer.id === "poi_r20") {
      const r1 = base.layers.find((l) => l.id === "poi_r1")
      layers.push({
        ...themeLayer({ ...r1, id: "poi_other" }, p),
        minzoom: 17,
        filter: ["all", ["match", ["geometry-type"], ["MultiPoint", "Point"], true, false], ["!", isShopping]],
      })
    }
  }
  // Its only layer (natural_earth hillshading) is dropped above.
  const sources = { ...base.sources }
  delete sources.ne2_shaded
  return {
    ...base,
    name: `Price Tracker ${p === palettes.dark ? "dark" : "light"}`,
    // Low intensity keeps extruded walls a shade darker than roofs, not near-black
    // blocks: seen from straight above, buildings should read flat like Google's.
    light: { anchor: "viewport", color: p.light, intensity: 0.2 },
    sources,
    layers,
  }
}

const base = JSON.parse(readFileSync(join(here, "liberty.json"), "utf8"))
for (const [name, palette] of Object.entries(palettes)) {
  const file = join(outDir, `${name}.json`)
  writeFileSync(file, JSON.stringify(build(base, palette)) + "\n")
  console.log(`wrote ${file}`)
}
