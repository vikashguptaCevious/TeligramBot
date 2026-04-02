import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function clamp01(n) {
  return Math.max(0, Math.min(1, n))
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ]
}

function writePng({ size, outFile, maskable }) {
  const png = new PNG({ width: size, height: size })

  const cA = [124, 58, 237] // violet-600
  const cB = [217, 70, 239] // fuchsia-500
  const cBg = [2, 6, 23] // slate-950

  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const r = (size * (maskable ? 0.28 : 0.34))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2

      const t = clamp01((x + y) / (2 * (size - 1)))
      const base = lerpColor(cA, cB, t)

      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const circle = clamp01(1 - (dist - r) / (size * 0.02))

      const bg = lerpColor(cBg, base, 0.25)
      const fill = lerpColor(bg, base, 0.85)
      const col = lerpColor(bg, fill, circle)

      png.data[idx] = col[0]
      png.data[idx + 1] = col[1]
      png.data[idx + 2] = col[2]
      png.data[idx + 3] = 255
    }
  }

  fs.writeFileSync(outFile, PNG.sync.write(png))
}

function main() {
  const root = path.resolve(__dirname, '..')
  const publicDir = path.join(root, 'public')
  fs.mkdirSync(publicDir, { recursive: true })

  writePng({
    size: 192,
    outFile: path.join(publicDir, 'pwa-192x192.png'),
    maskable: false,
  })
  writePng({
    size: 512,
    outFile: path.join(publicDir, 'pwa-512x512.png'),
    maskable: false,
  })
  writePng({
    size: 512,
    outFile: path.join(publicDir, 'pwa-maskable-512x512.png'),
    maskable: true,
  })
  writePng({
    size: 512,
    outFile: path.join(publicDir, 'icon.png'),
    maskable: false,
  })

  // eslint-disable-next-line no-console
  console.log('PWA icons generated in /public')
}

main()

