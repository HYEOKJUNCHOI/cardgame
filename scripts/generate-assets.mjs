import fs from 'node:fs/promises'
import sharp from 'sharp'
import { geoArea, geoMercator, geoPath } from 'd3-geo'

const countries = ['KOR', 'JPN', 'USA', 'FRA', 'BRA', 'AUS', 'EGY', 'IND']
const fallbackNames = { FRA: 'France' }
const mainlandOnly = new Set(['USA', 'FRA'])
const geo = JSON.parse(await fs.readFile('/tmp/countries.geojson', 'utf8'))
await fs.mkdir('public/assets/countries', { recursive: true })

for (const code of countries) {
  const feature = geo.features.find((f) =>
    f.properties['ISO3166-1-Alpha-3'] === code || f.properties.name === fallbackNames[code],
  )
  if (!feature) throw new Error(`Missing geometry: ${code}`)
  const renderFeature = mainlandOnly.has(code) && feature.geometry.type === 'MultiPolygon'
    ? {
        ...feature,
        geometry: {
          type: 'Polygon',
          coordinates: feature.geometry.coordinates
            .map((coordinates) => ({ coordinates, area: geoArea({ type: 'Polygon', coordinates }) }))
            .sort((a, b) => b.area - a.area)[0].coordinates,
        },
      }
    : feature
  const projection = geoMercator().fitExtent([[34, 30], [478, 354]], renderFeature)
  const path = geoPath(projection)(renderFeature)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="384" viewBox="0 0 512 384">
    <defs><filter id="s"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#271708" flood-opacity=".42"/></filter></defs>
    <path d="${path}" fill="#173757" stroke="#b57a25" stroke-width="8" stroke-linejoin="round" filter="url(#s)"/>
    <path d="${path}" fill="none" stroke="#f4d27e" stroke-width="2" stroke-linejoin="round" opacity=".9"/>
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(`public/assets/countries/${code}.png`)
}

// Remove only the connected near-white exterior around the generated front card.
const frontPath = 'public/assets/ui/card-front.png'
const image = sharp(frontPath)
const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info
const seen = new Uint8Array(width * height)
const queue = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]
const nearWhite = (i) => data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238
for (let q = 0; q < queue.length; q++) {
  const [x, y] = queue[q]
  if (x < 0 || y < 0 || x >= width || y >= height) continue
  const p = y * width + x
  if (seen[p]) continue
  seen[p] = 1
  const i = p * channels
  if (!nearWhite(i)) continue
  data[i + 3] = 0
  queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
}
await sharp(data, { raw: info }).png().toFile('public/assets/ui/card-front-clean.png')

// The generated back arrived with a baked light checkerboard. Remove only bright neutral pixels.
const backPath = 'public/assets/ui/card-back.png'
const back = sharp(backPath)
const backRaw = await back.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
for (let i = 0; i < backRaw.data.length; i += backRaw.info.channels) {
  const r = backRaw.data[i]
  const g = backRaw.data[i + 1]
  const b = backRaw.data[i + 2]
  const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 10
  if (neutral && r > 205) backRaw.data[i + 3] = 0
}
await sharp(backRaw.data, { raw: backRaw.info }).png().toFile('public/assets/ui/card-back-clean.png')
console.log(`Generated ${countries.length} silhouettes and cleaned both card shells.`)
