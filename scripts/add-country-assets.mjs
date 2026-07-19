import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const countries = [
  { iso2: 'ca', iso3: 'CAN' },
  { iso2: 'de', iso3: 'DEU' },
  { iso2: 'it', iso3: 'ITA' },
  { iso2: 'cn', iso3: 'CHN' },
]

async function fetchBuffer(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return Buffer.from(await response.arrayBuffer())
}

for (const country of countries) {
  const svgBuffer = await fetchBuffer(`https://raw.githubusercontent.com/djaiss/mapsicon/master/all/${country.iso2}/vector.svg`)
  const svg = svgBuffer.toString('utf8')
    .replace('fill="#000000" stroke="none"', 'fill="#163856" stroke="#b57a26" stroke-width="42" stroke-linejoin="round"')

  const trimmed = await sharp(Buffer.from(svg))
    .resize(460, 348, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer()

  const silhouette = await sharp({
    create: { width: 512, height: 384, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trimmed, gravity: 'centre' }])
    .png()
    .toBuffer()

  await fs.writeFile(path.join(root, 'public/assets/countries', `${country.iso3}.png`), silhouette)
  console.log(country.iso3)
}
