/**
 * Run: npx --yes tsx src/app/(provider)/provider/route-planning/utils.mapsChunks.selftest.ts
 * (from frontend/)
 */
import assert from "node:assert/strict";
import type { Stop } from "./types";
import {
  GOOGLE_MAPS_MAX_WAYPOINTS,
  GOOGLE_MAPS_MAX_STOPS_PER_LEG,
  chunkStopsForGoogleMaps,
  needsGoogleMapsTourChunks,
  mapsUrlFromAddresses,
} from "./utils";

function makeStops(n: number): Stop[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`,
    name: `Stop ${i + 1}`,
    address: `${100 + i} Main St`,
    city: "Toronto",
    postal_code: "M5V 1A1",
  }));
}

function countWaypoints(url: string): number {
  const m = url.match(/[?&]waypoints=([^&]*)/);
  if (!m) return 0;
  return decodeURIComponent(m[1]).split("|").filter(Boolean).length;
}

// --- single / short tours ---
assert.equal(needsGoogleMapsTourChunks("Kitchen, Toronto", makeStops(5)), false);
const short = chunkStopsForGoogleMaps("Kitchen, Toronto", makeStops(5));
assert.equal(short.length, 1);
assert.match(short[0].label, /Full tour/);
assert.equal(short[0].stopFrom, 1);
assert.equal(short[0].stopTo, 5);
assert.ok(countWaypoints(short[0].url) <= GOOGLE_MAPS_MAX_WAYPOINTS);

// --- boundary: origin + 10 stops = 11 places = max (9 wp + dest) ---
assert.equal(needsGoogleMapsTourChunks("Kitchen", makeStops(10)), false);
assert.equal(needsGoogleMapsTourChunks("Kitchen", makeStops(11)), true);

// --- long tour chunks ---
const stops50 = makeStops(50);
assert.equal(needsGoogleMapsTourChunks("Kitchen HQ", stops50), true);
const chunks = chunkStopsForGoogleMaps("Kitchen HQ", stops50);
assert.ok(chunks.length >= 5, `expected several parts, got ${chunks.length}`);
assert.equal(chunks[0].stopFrom, 1);
assert.equal(chunks[chunks.length - 1].stopTo, 50);
for (const c of chunks) {
  assert.ok(countWaypoints(c.url) <= GOOGLE_MAPS_MAX_WAYPOINTS, c.label);
  assert.ok(c.stopTo - c.stopFrom + 1 <= GOOGLE_MAPS_MAX_STOPS_PER_LEG);
}
// Connected legs: each part after the first should cover the next contiguous range
for (let i = 1; i < chunks.length; i++) {
  assert.equal(chunks[i].stopFrom, chunks[i - 1].stopTo + 1);
}

// --- mapsUrlFromAddresses pin ---
assert.match(mapsUrlFromAddresses(["Only Place"]), /maps\.google\.com\/\?q=/);

console.log("utils.mapsChunks.selftest: OK");
