'use client'
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Trail, type MeshLineGeometry } from '@react-three/drei'
import * as THREE from 'three'
import type { MeshLineMaterial } from 'meshline'
import type { NormalizedPoint } from '@/utils/gyroTracker'

type TargetPair = [NormalizedPoint | null, NormalizedPoint | null]

interface Props {
  // A ref (not React state) so the 60fps tracking loop in CameraView doesn't
  // force a React re-render of the whole match screen every frame.
  targetsRef: React.RefObject<TargetPair>
  active: boolean
}

// One color per tracking slot — the two gyros don't carry a known player identity from
// motion detection alone, so these just need to read as visually distinct.
const TRAIL_COLORS = ['#fbbf24', '#38bdf8'] as const

// Each gyro's tail is several independent thin strands that wobble slightly out of phase
// with each other (instead of one ribbon), so they read as loosely twisted light-wires
// rather than a flat band — matching the reference's braided-streak look.
const STRAND_COUNT = 4
// A fixed per-strand spread (so strands are guaranteed visually separate) plus a small
// dynamic wobble on top (so they don't read as perfectly parallel straight lines).
const STRAND_BASE_X: readonly number[] = [-7, -2.5, 2.5, 7]
const STRAND_BASE_Y: readonly number[] = [3, -3, 3, -3]
const STRAND_WOBBLE = 2.2 // px
const STRAND_FREQ: readonly number[] = [1.7, 2.6, 1.3, 3.1]
const STRAND_PHASE: readonly number[] = [0, 1.4, 2.7, 4.6]

// Horizontal alpha gradient (u=0 → tail/oldest point, u=1 → head/newest, per meshline's UVs):
// stays near-zero for most of the tail then ramps up near the head, so the streak reads as a
// dissipating light trail rather than a flat-opacity ribbon.
function createTailAlphaTexture(): THREE.Texture {
  const w = 128
  const h = 8
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, w, 0)
  gradient.addColorStop(0, 'rgba(255,255,255,0)')
  gradient.addColorStop(0.5, 'rgba(255,255,255,0)')
  gradient.addColorStop(0.75, 'rgba(255,255,255,0.5)')
  gradient.addColorStop(1, 'rgba(255,255,255,1)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  return new THREE.CanvasTexture(canvas)
}

// Lens-flare style sparkle: soft core glow + many thin irregular-length radiating spikes,
// plus a scatter of small ember dots — built once per color (deterministic per mount, the
// randomness just varies spike/ember layout, not motion).
function createFlareTexture(color: string): THREE.Texture {
  const size = 160
  const cx = size / 2
  const cy = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = new THREE.Color(color)
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5)
  core.addColorStop(0, 'rgba(255,255,255,1)')
  core.addColorStop(0.2, `rgba(${rgb},0.95)`)
  core.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = core
  ctx.fillRect(0, 0, size, size)

  const drawSpike = (angle: number, length: number, width: number) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    const grad = ctx.createLinearGradient(0, 0, length, 0)
    grad.addColorStop(0, 'rgba(255,255,255,0.95)')
    grad.addColorStop(0.12, `rgba(${rgb},0.55)`)
    grad.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(0, -width / 2)
    ctx.lineTo(length, 0)
    ctx.lineTo(0, width / 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  const SPIKE_COUNT = 22
  for (let i = 0; i < SPIKE_COUNT; i++) {
    const angle = (i / SPIKE_COUNT) * Math.PI * 2 + Math.sin(i * 2.1) * 0.12
    const long = i % 3 === 0
    const length = size * (long ? 0.46 + Math.sin(i) * 0.06 : 0.22 + Math.cos(i * 1.7) * 0.08)
    const width = long ? 2.5 : 1.2
    drawSpike(angle, length, width)
  }

  // Ember dust scattered around the burst
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.5
    const r = size * (0.3 + ((i * 0.37) % 0.25))
    const ex = cx + Math.cos(a) * r
    const ey = cy + Math.sin(a) * r
    const er = 1 + (i % 3)
    const emberGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, er * 2.5)
    emberGrad.addColorStop(0, 'rgba(255,255,255,0.9)')
    emberGrad.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = emberGrad
    ctx.beginPath()
    ctx.arc(ex, ey, er * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  return new THREE.CanvasTexture(canvas)
}

function GyroMarker({
  targetsRef,
  slot,
  active,
}: {
  targetsRef: React.RefObject<TargetPair>
  slot: 0 | 1
  active: boolean
}) {
  const { size } = useThree()
  const anchorRef = useRef<THREE.Group>(null!)
  const strandRefs = useRef<(THREE.Group | null)[]>([])
  const haloTrailRef = useRef<MeshLineGeometry>(null)
  const strandTrailRefs = useRef<(MeshLineGeometry | null)[]>([])
  // Stable target ref objects for each strand's <Trail> — created once so Trail's internal
  // anchor-detection effect (keyed on this object's identity) doesn't re-run every render.
  const strandTargetRefs = useMemo(
    () =>
      Array.from({ length: STRAND_COUNT }, () => ({ current: null as THREE.Object3D | null })),
    []
  )
  const color = TRAIL_COLORS[slot]
  const flareTexture = useMemo(() => createFlareTexture(color), [color])
  const tailAlphaTexture = useMemo(() => createTailAlphaTexture(), [])

  // Trail's default material is an opaque ribbon with no alpha falloff. Reach into the
  // actual mesh each Trail renders (via its forwarded ref) and patch the material
  // imperatively — simpler and less bundler-fragile than registering <meshLineMaterial> as
  // a JSX intrinsic. Trail recreates this material whenever the canvas resizes, so the
  // patch re-checks identity every frame instead of running once on mount.
  const patchedRefs = useRef<Map<MeshLineGeometry, MeshLineMaterial>>(new Map())

  const patchTrailMaterial = (
    meshRef: React.RefObject<MeshLineGeometry | null>,
    opacity: number,
    matColor?: string
  ) => {
    const mesh = meshRef.current
    const mat = mesh?.material as MeshLineMaterial | undefined
    if (mesh && mat && patchedRefs.current.get(mesh) !== mat) {
      mat.transparent = true
      mat.depthWrite = false
      mat.blending = THREE.AdditiveBlending
      mat.alphaMap = tailAlphaTexture
      mat.useAlphaMap = 1
      mat.opacity = opacity
      if (matColor) mat.color = new THREE.Color(matColor)
      mat.needsUpdate = true
      patchedRefs.current.set(mesh, mat)
    }
  }

  useFrame((state) => {
    const anchor = anchorRef.current
    const target = targetsRef.current[slot]
    if (!anchor) return
    const visible = active && !!target
    anchor.visible = visible
    if (visible && target) {
      const x = (target.x - 0.5) * size.width
      const y = (0.5 - target.y) * size.height
      anchor.position.set(x, y, 0)

      const t = state.clock.elapsedTime
      for (let i = 0; i < STRAND_COUNT; i++) {
        const strand = strandRefs.current[i]
        if (!strand) continue
        strand.visible = true
        const ox = STRAND_BASE_X[i] + Math.sin(t * STRAND_FREQ[i] + STRAND_PHASE[i]) * STRAND_WOBBLE
        const oy = STRAND_BASE_Y[i] + Math.cos(t * STRAND_FREQ[i] * 0.85 + STRAND_PHASE[i]) * STRAND_WOBBLE
        strand.position.set(x + ox, y + oy, 0)
      }
    } else {
      for (const strand of strandRefs.current) {
        if (strand) strand.visible = false
      }
    }

    patchTrailMaterial(haloTrailRef, 0.18)
    for (const trailRef of strandTrailRefs.current) {
      patchTrailMaterial({ current: trailRef }, 0.85, '#fff7e0')
    }
  })

  useEffect(() => () => {
    flareTexture.dispose()
    tailAlphaTexture.dispose()
  }, [flareTexture, tailAlphaTexture])

  return (
    <>
      {/* Soft wide halo behind the thin strands — subtle ambient glow, not the main shape */}
      <Trail
        ref={haloTrailRef}
        width={4}
        length={9}
        decay={1}
        attenuation={(t) => 0.5 + 0.5 * t}
        color={color}
        target={anchorRef}
      />

      {/* Head: starburst sparkle sprite */}
      <group ref={anchorRef} visible={false}>
        <sprite scale={[46, 46, 1]}>
          <spriteMaterial
            map={flareTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>

      {/* Tail: several thin independently-wobbling strands instead of one ribbon */}
      {Array.from({ length: STRAND_COUNT }).map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            strandRefs.current[i] = el
            strandTargetRefs[i].current = el
          }}
          visible={false}
        />
      ))}
      {Array.from({ length: STRAND_COUNT }).map((_, i) => (
        <Trail
          key={i}
          ref={(el) => { strandTrailRefs.current[i] = el }}
          width={0.9}
          length={9}
          decay={1}
          attenuation={(t) => 0.5 + 0.5 * t}
          color="#fff7e0"
          target={strandTargetRefs[i] as React.RefObject<THREE.Object3D>}
        />
      ))}
    </>
  )
}

export default function TrajectoryOverlay({ targetsRef, active }: Props) {
  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 10], near: 0.1, far: 100 }}
        gl={{ alpha: true }}
        style={{ background: 'transparent' }}
      >
        <GyroMarker targetsRef={targetsRef} slot={0} active={active} />
        <GyroMarker targetsRef={targetsRef} slot={1} active={active} />
      </Canvas>
    </div>
  )
}
