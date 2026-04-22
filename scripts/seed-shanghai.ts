import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { nanoid } from "nanoid";
import { db, points } from "../lib/db";

const SHANGHAI_CENTER = { lat: 31.2304, lng: 121.4737 };
const RADIUS_KM = 12;
const COUNT = Number(process.argv[2] ?? 15);

function randomPointAround(lat: number, lng: number, radiusKm: number) {
  const r = radiusKm / 111;
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const dLat = w * Math.cos(t);
  const dLng = (w * Math.sin(t)) / Math.cos((lat * Math.PI) / 180);
  return { lat: lat + dLat, lng: lng + dLng };
}

async function run() {
  const rows = Array.from({ length: COUNT }, () => {
    const { lat, lng } = randomPointAround(
      SHANGHAI_CENTER.lat,
      SHANGHAI_CENTER.lng,
      RADIUS_KM
    );
    const seed = nanoid(8);
    const photoUrl = `https://picsum.photos/seed/${seed}/600/800`;
    return {
      id: nanoid(12),
      lat,
      lng,
      title: null,
      description: null,
      author: null,
      photoKey: photoUrl,
      photoWidth: 600,
      photoHeight: 800,
    };
  });

  await db.insert(points).values(rows);
  console.log(`Inserted ${rows.length} points around Shanghai`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
