"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/shared/core/utils"

interface Vector2D {
  x: number
  y: number
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 }
  vel: Vector2D = { x: 0, y: 0 }
  acc: Vector2D = { x: 0, y: 0 }
  target: Vector2D = { x: 0, y: 0 }

  closeEnoughTarget = 100
  maxSpeed = 1.0
  maxForce = 0.1
  particleSize = 10
  isKilled = false

  startColor = { r: 0, g: 0, b: 0 }
  targetColor = { r: 0, g: 0, b: 0 }
  colorWeight = 0
  colorBlendRate = 0.01

  move() {
    const dx = this.target.x - this.pos.x
    const dy = this.target.y - this.pos.y
    const d2 = dx * dx + dy * dy
    
    if (d2 < 0.1) {
      this.pos.x = this.target.x
      this.pos.y = this.target.y
      return
    }

    const distance = Math.sqrt(d2)
    const proximityMult = distance < this.closeEnoughTarget ? distance / this.closeEnoughTarget : 1

    const towardsTargetX = (dx / distance) * this.maxSpeed * proximityMult
    const towardsTargetY = (dy / distance) * this.maxSpeed * proximityMult

    const steerX = towardsTargetX - this.vel.x
    const steerY = towardsTargetY - this.vel.y
    
    const steerD2 = steerX * steerX + steerY * steerY
    if (steerD2 > 0.0001) {
      const steerMag = Math.sqrt(steerD2)
      this.acc.x += (steerX / steerMag) * this.maxForce
      this.acc.y += (steerY / steerMag) * this.maxForce
    }

    this.vel.x += this.acc.x
    this.vel.y += this.acc.y
    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.acc.x = 0
    this.acc.y = 0
  }

  draw(ctx: CanvasRenderingContext2D, drawAsPoints: boolean) {
    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0)
    }

    const currentColor = {
      r: Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight),
      g: Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight),
      b: Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight),
    }

    if (drawAsPoints) {
      ctx.fillStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2)
    } else {
      ctx.fillStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`
      ctx.beginPath()
      ctx.arc(this.pos.x, this.pos.y, this.particleSize / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  kill(width: number, height: number) {
    if (!this.isKilled) {
      const angle = Math.random() * Math.PI * 2
      const mag = (width + height) / 2
      this.target.x = width / 2 + Math.cos(angle) * mag
      this.target.y = height / 2 + Math.sin(angle) * mag

      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      }
      this.targetColor = { r: 10, g: 20, b: 40 }
      this.colorWeight = 0
      this.isKilled = true
    }
  }
}

interface ParticleTextEffectProps {
  words?: string[]
  className?: string
  scrollProgress?: number
}

const DEFAULT_WORDS = ["MENTRIXA", "FAST", "SMART", "GUIDE"]

export function ParticleTextEffect({ 
  words = DEFAULT_WORDS, 
  className,
  scrollProgress = 1
}: ParticleTextEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const frameCountRef = useRef(0)
  const wordIndexRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0, isPressed: false, isRightClick: false })
  const isVisibleRef = useRef(true)

  // Higher pixel steps for performance
  const pixelSteps = 5
  const drawAsPoints = true
  const MAX_PARTICLES = 2800;

  const generateRandomPos = useCallback((x: number, y: number, mag: number): Vector2D => {
    const angle = Math.random() * Math.PI * 2
    return { 
      x: x + Math.cos(angle) * mag, 
      y: y + Math.sin(angle) * mag 
    }
  }, [])

  const nextWord = useCallback((word: string, canvas: HTMLCanvasElement) => {
    const offscreenCanvas = document.createElement("canvas")
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height
    const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true })!

    // Clear with transparency
    offscreenCtx.clearRect(0, 0, canvas.width, canvas.height)
    
    offscreenCtx.fillStyle = "#FFFFFF"
    const fontSize = word.length > 20 ? 45 : word.length > 12 ? 60 : 90;
    offscreenCtx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`
    offscreenCtx.textAlign = "center"
    offscreenCtx.textBaseline = "middle"
    offscreenCtx.fillText(word, canvas.width / 2, canvas.height / 2, canvas.width - 40)

    const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data

    const useCyan = Math.random() > 0.5;
    const newColor = useCyan 
      ? { r: 6, g: 182, b: 212 } // cyan-500
      : { r: 37, g: 99, b: 235 } // blue-600

    const particles = particlesRef.current
    let particleIndex = 0

    // Only sample every pixelSteps pixels to stay under MAX_PARTICLES
    for (let y = 0; y < canvas.height; y += pixelSteps) {
      for (let x = 0; x < canvas.width; x += pixelSteps) {
        const i = (y * canvas.width + x) * 4
        const alpha = pixels[i + 3]

        if (alpha !== undefined && alpha > 128) {
          if (particleIndex >= MAX_PARTICLES) break

          let particle: Particle
          if (particleIndex < particles.length) {
            particle = particles[particleIndex] as Particle;
            particle.isKilled = false
          } else {
            particle = new Particle()
            const randomPos = generateRandomPos(canvas.width / 2, canvas.height / 2, (canvas.width + canvas.height) / 2)
            particle.pos.x = randomPos.x
            particle.pos.y = randomPos.y
            particle.maxSpeed = Math.random() * 3 + 4
            particle.maxForce = particle.maxSpeed * 0.12
            particle.particleSize = Math.random() * 2 + 2
            particle.colorBlendRate = Math.random() * 0.05 + 0.01
            particles.push(particle)
          }

          particle.target.x = x
          particle.target.y = y
          particle.targetColor = newColor
          particle.colorWeight = 0
          particleIndex++
        }
      }
      if (particleIndex >= MAX_PARTICLES) break
    }

    for (let i = particleIndex; i < particles.length; i++) {
        const p = particles[i];
        if (p) p.kill(canvas.width, canvas.height);
    }
  }, [generateRandomPos, pixelSteps])

  const animate = useCallback(() => {
    if (!isVisibleRef.current) {
      animationRef.current = requestAnimationFrame(animate)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")!
    const particles = particlesRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Gradual reveal based on scrollProgress
    // We want full opacity/cohesion by 0.5 scroll
    const cohesion = Math.min(1, scrollProgress * 2)
    ctx.globalAlpha = cohesion

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      if (!particle) continue;

      // When scattered, move particles randomly or reduce force
      const originalMaxForce = particle.maxForce
      if (cohesion < 0.8) {
        particle.maxForce = originalMaxForce * cohesion
      }

      particle.move()
      particle.draw(ctx, drawAsPoints)
      
      particle.maxForce = originalMaxForce // Reset for next frame
    }
    
    ctx.globalAlpha = 1.0

    if (mouseRef.current.isPressed) {
      const radius = 60;
      particles.forEach((particle) => {
        const dx = particle.pos.x - mouseRef.current.x;
        const dy = particle.pos.y - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < radius) {
          if (mouseRef.current.isRightClick) {
            particle.kill(canvas.width, canvas.height)
          } else {
             // Repulse
             const angle = Math.atan2(dy, dx);
             particle.vel.x += Math.cos(angle) * 2;
             particle.vel.y += Math.sin(angle) * 2;
          }
        }
      })
    }

    frameCountRef.current++
    if (frameCountRef.current % 180 === 0) {
      wordIndexRef.current = (wordIndexRef.current + 1) % words.length
      const w = words[wordIndexRef.current];
      if (w) nextWord(w, canvas);
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [words, nextWord, drawAsPoints, scrollProgress])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 1200
    canvas.height = 300

    const initialWord = words[0];
    if (initialWord) nextWord(initialWord, canvas);
    animate()

    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isPressed = true
      mouseRef.current.isRightClick = e.button === 2
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - rect.left) * (canvas.width / rect.width)
      mouseRef.current.y = (e.clientY - rect.top) * (canvas.height / rect.height)
    }

    const handleMouseUp = () => {
      mouseRef.current.isPressed = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - rect.left) * (canvas.width / rect.width)
      mouseRef.current.y = (e.clientY - rect.top) * (canvas.height / rect.height)
    }

    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry?.isIntersecting ?? false
    }, { threshold: 0.1 })

    if (canvas) observer.observe(canvas)

    canvas.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("contextmenu", (e) => e.preventDefault())

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (canvas) observer.unobserve(canvas)
      canvas.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mousemove", handleMouseMove)
    }
  }, [words, animate, nextWord])

  return (
    <div className={cn("relative flex flex-col items-center justify-center w-full max-w-4xl mx-auto", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto cursor-crosshair drop-shadow-2xl"
      />
    </div>
  )
}
