"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface Vector2D {
  x: number
  y: number
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 }
  vel: Vector2D = { x: 0, y: 0 }
  acc: Vector2D = { x: 0, y: 0 }
  target: Vector2D = { x: 0, y: 0 }

  closeEnoughTarget = 20
  maxSpeed = 1.5
  maxForce = 0.2
  particleSize = 10
  isKilled = false

  startColor = { r: 0, g: 0, b: 0 }
  targetColor = { r: 0, g: 0, b: 0 }
  colorWeight = 0
  colorBlendRate = 0.01

  move() {
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const distanceSq = dx * dx + dy * dy;

    let proximityMult = 1;
    if (distanceSq < this.closeEnoughTarget * this.closeEnoughTarget) {
      proximityMult = Math.sqrt(distanceSq) / this.closeEnoughTarget;
    }

    const magnitude = Math.sqrt(distanceSq);
    let towardsTargetX = 0;
    let towardsTargetY = 0;
    
    if (magnitude > 0) {
      towardsTargetX = (dx / magnitude) * this.maxSpeed * proximityMult;
      towardsTargetY = (dy / magnitude) * this.maxSpeed * proximityMult;
    }

    const steerX = towardsTargetX - this.vel.x;
    const steerY = towardsTargetY - this.vel.y;
    const steerMagnitude = Math.sqrt(steerX * steerX + steerY * steerY);

    if (steerMagnitude > 0) {
      this.acc.x += (steerX / steerMagnitude) * this.maxForce;
      this.acc.y += (steerY / steerMagnitude) * this.maxForce;
    }

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.acc.x = 0;
    this.acc.y = 0;
  }

  draw(ctx: CanvasRenderingContext2D, drawAsPoints: boolean) {
    if (this.isKilled) return

    // Blend towards target color
    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0)
    }

    // Calculate current color
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

  kill() {
    if (!this.isKilled) {
      // Set target to a nearby random position instead of far away to reduce flashing
      this.target.x = this.pos.x + (Math.random() - 0.5) * 100
      this.target.y = this.pos.y + (Math.random() - 0.5) * 100

      // Begin blending color to background (black) slowly
      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      }
      this.targetColor = { r: 0, g: 0, b: 0 }
      this.colorWeight = 0

      this.isKilled = true
      this.maxSpeed = 0.5
      this.maxForce = 0.02
    }
  }
}

interface ParticleTextEffectProps {
  words?: string[]
  className?: string
}

const DEFAULT_WORDS = ["HELLO", "21st.dev", "ParticleTextEffect", "BY", "KAINXU"]

export function ParticleTextEffect({ words = DEFAULT_WORDS, className }: ParticleTextEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const frameCountRef = useRef(0)
  const wordIndexRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0, isPressed: false, isRightClick: false })

  const pixelSteps = 6
  const drawAsPoints = true

  const generateRandomPos = useCallback((x: number, y: number, mag: number): Vector2D => {
    const randomX = Math.random() * 1000
    const randomY = Math.random() * 500

    const direction = {
      x: randomX - x,
      y: randomY - y,
    }

    const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y)
    if (magnitude > 0) {
      direction.x = (direction.x / magnitude) * mag
      direction.y = (direction.y / magnitude) * mag
    }

    return {
      x: x + direction.x,
      y: y + direction.y,
    }
  }, [])

  const nextWord = useCallback((word: string, canvas: HTMLCanvasElement, immediate = false) => {
    // Create off-screen canvas for text rendering
    const offscreenCanvas = document.createElement("canvas")
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height
    const offscreenCtx = offscreenCanvas.getContext("2d")!

    // Draw text with multi-color support for records
    const recordMatch = word.match(/^(\d+W)\s*-\s*(\d+L)(?:\s*-\s*(\d+D))?$/i);
    
    if (recordMatch) {
      const fontSize = 100;
      offscreenCtx.font = `bold ${fontSize}px Arial`;
      offscreenCtx.textAlign = "left"; // Keep left for multi-part measurement, but we'll offset the start
      offscreenCtx.textBaseline = "middle";
      
      const winPart = recordMatch[1]!;
      const lossPart = recordMatch[2]!;
      const drawPart = recordMatch[3];
      
      // Calculate total width for centering
      let totalWidth = offscreenCtx.measureText(winPart).width;
      totalWidth += offscreenCtx.measureText(" - ").width;
      totalWidth += offscreenCtx.measureText(lossPart).width;
      if (drawPart) {
        totalWidth += offscreenCtx.measureText(" - ").width;
        totalWidth += offscreenCtx.measureText(drawPart).width;
      }
      
      let xOffset = (canvas.width - totalWidth) / 2;
      
      // Wins (Blue-400)
      offscreenCtx.fillStyle = "#60a5fa"; 
      offscreenCtx.fillText(winPart, xOffset, canvas.height / 2);
      xOffset += offscreenCtx.measureText(winPart).width;
      
      // Dash
      offscreenCtx.fillStyle = "#94a3b8"; // slate-400
      offscreenCtx.fillText(" - ", xOffset, canvas.height / 2);
      xOffset += offscreenCtx.measureText(" - ").width;
      
      // Losses (Purple-500)
      offscreenCtx.fillStyle = "#a855f7"; 
      offscreenCtx.fillText(lossPart, xOffset, canvas.height / 2);
      xOffset += offscreenCtx.measureText(lossPart).width;
      
      if (drawPart) {
        // Dash
        offscreenCtx.fillStyle = "#94a3b8"; // slate-400
        offscreenCtx.fillText(" - ", xOffset, canvas.height / 2);
        xOffset += offscreenCtx.measureText(" - ").width;
        
        // Draws (Blue-500)
        offscreenCtx.fillStyle = "#3b82f6"; 
        offscreenCtx.fillText(drawPart, xOffset, canvas.height / 2);
      }
    } else {
      // Default rendering - Centered
      offscreenCtx.fillStyle = "white";
      const fontSize = word.length > 15 ? 50 : word.length > 10 ? 70 : 100;
      offscreenCtx.font = `bold ${fontSize}px Arial`;
      offscreenCtx.textAlign = "center";
      offscreenCtx.textBaseline = "middle";
      offscreenCtx.fillText(word, canvas.width / 2, canvas.height / 2);
    }

    const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data

    const particles = particlesRef.current
    let particleIndex = 0

    // Collect coordinates
    const coordsIndexes: number[] = []
    for (let i = 0; i < pixels.length; i += pixelSteps * 4) {
      coordsIndexes.push(i)
    }

    // Shuffle coordinates for fluid motion
    for (let i = coordsIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[coordsIndexes[i], coordsIndexes[j]] = [coordsIndexes[j]!, coordsIndexes[i]!]
    }

    // INCREASE MAX PARTICLES HERE SO "PROVE WHAT YOU KNOW" is not cut off due to max limit
    const MAX_PARTICLES = 3500;

    for (const coordIndex of coordsIndexes) {
      if (particleIndex >= MAX_PARTICLES) break;

      const pixelIndex = coordIndex
      const alpha = pixels[pixelIndex + 3]

      if (alpha !== undefined && alpha > 128) {
        const r = pixels[pixelIndex] ?? 255
        const g = pixels[pixelIndex + 1] ?? 255
        const b = pixels[pixelIndex + 2] ?? 255

        // Skip dark pixels to avoid "black particles" from anti-aliasing
        if (r < 50 && g < 50 && b < 50) continue;

        const x = (pixelIndex / 4) % canvas.width
        const y = Math.floor(pixelIndex / 4 / canvas.width)

        let particle: Particle

        if (particleIndex < particles.length) {
          particle = particles[particleIndex]!
          particle.isKilled = false
          if (immediate) {
            particle.pos.x = x
            particle.pos.y = y
          }
          particleIndex++
        } else {
          particle = new Particle()

          const randomPos = generateRandomPos(canvas.width / 2, canvas.height / 2, 50)
          particle.pos.x = immediate ? x : randomPos.x
          particle.pos.y = immediate ? y : randomPos.y

          if (immediate) {
            particle.vel.x = (Math.random() - 0.5) * 2
            particle.vel.y = (Math.random() - 0.5) * 2
          }

          particle.maxSpeed = Math.random() * 12 + 8
          particle.maxForce = particle.maxSpeed * 0.2
          particle.particleSize = Math.random() * 4 + 4
          particle.colorBlendRate = Math.random() * 0.05 + 0.01

          particles.push(particle)
          particleIndex++
        }

        // Set color transition
        particle.startColor = {
          r: particle.startColor.r + (particle.targetColor.r - particle.startColor.r) * particle.colorWeight,
          g: particle.startColor.g + (particle.targetColor.g - particle.startColor.g) * particle.colorWeight,
          b: particle.startColor.b + (particle.targetColor.b - particle.startColor.b) * particle.colorWeight,
        }
        
        // Sample color from the pixel
        particle.targetColor = {
          r: pixels[pixelIndex] ?? 0,
          g: pixels[pixelIndex + 1] ?? 0,
          b: pixels[pixelIndex + 2] ?? 0,
        }
        particle.colorWeight = 0

        particle.target.x = x
        particle.target.y = y
      }
    }

    // Kill remaining particles
    for (let i = particleIndex; i < particles.length; i++) {
      particles[i]?.kill()
    }
  }, [pixelSteps, generateRandomPos])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")!
    const particles = particlesRef.current

    // Background with motion blur (transparent so it overlays)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i]
      if (!particle) continue;
      particle.move()
      particle.draw(ctx, drawAsPoints)

      // Remove dead particles that are out of bounds
      if (particle.isKilled) {
        if (
          particle.pos.x < 0 ||
          particle.pos.x > canvas.width ||
          particle.pos.y < 0 ||
          particle.pos.y > canvas.height
        ) {
          particles.splice(i, 1)
        }
      }
    }

    // Handle mouse interaction
    if (mouseRef.current.isPressed && mouseRef.current.isRightClick) {
      particles.forEach((particle) => {
        const distance = Math.sqrt(
          Math.pow(particle.pos.x - mouseRef.current.x, 2) + Math.pow(particle.pos.y - mouseRef.current.y, 2),
        )
        if (distance < 50) {
          particle.kill()
        }
      })
    }

    // Auto-advance words with custom timing
    if (words.length > 1) {
      frameCountRef.current++
      
      const currentWord = words[wordIndexRef.current] || ""
      // Reduced delay: about 5 seconds instead of 20
      const targetFrames = Math.max(300, 200 + currentWord.length * 10)

      if (frameCountRef.current >= targetFrames) {
        frameCountRef.current = 0
        wordIndexRef.current = (wordIndexRef.current + 1) % words.length
        const w = words[wordIndexRef.current]
        if (w) nextWord(w, canvas)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [words, nextWord, drawAsPoints])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Reduced height so the text fills the canvas vertically and isn't squished into a flat cloud
    canvas.width = 1000
    canvas.height = 150

    // Initialize with first word - immediate for instant visibility
    const initialW = words[0]
    if (initialW) nextWord(initialW, canvas, true)

    // Start animation
    animate()

    // Mouse event handlers
    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isPressed = true
      mouseRef.current.isRightClick = e.button === 2
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - rect.left) * (canvas.width / rect.width)
      mouseRef.current.y = (e.clientY - rect.top) * (canvas.height / rect.height)
    }

    const handleMouseUp = () => {
      mouseRef.current.isPressed = false
      mouseRef.current.isRightClick = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - rect.left) * (canvas.width / rect.width)
      mouseRef.current.y = (e.clientY - rect.top) * (canvas.height / rect.height)
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("contextmenu", handleContextMenu)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [words, animate, nextWord])

  return (
    <div className={cn("flex flex-col items-center justify-center w-full", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto cursor-crosshair drop-shadow-2xl"
      />
    </div>
  )
}
