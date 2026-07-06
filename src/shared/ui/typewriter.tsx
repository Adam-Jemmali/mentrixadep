"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { motion, Variants, useInView } from "framer-motion"

import { cn } from "@/shared/core/utils"

interface TypewriterProps {
  text: string | string[]
  speed?: number
  initialDelay?: number
  waitTime?: number
  deleteSpeed?: number
  loop?: boolean
  className?: string
  showCursor?: boolean
  hideCursorOnType?: boolean
  cursorChar?: string | React.ReactNode
  cursorAnimationVariants?: {
    initial: Variants["initial"]
    animate: Variants["animate"]
  }
  cursorClassName?: string
  /** Fires once when typing finishes and `loop` is false */
  onComplete?: () => void
}

export const Typewriter = ({
  text,
  speed = 50,
  initialDelay = 0,
  waitTime = 2000,
  deleteSpeed = 30,
  loop = true,
  className,
  showCursor = true,
  hideCursorOnType = false,
  cursorChar = "|",
  cursorClassName = "ml-1",
  onComplete,
  cursorAnimationVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.01,
        repeat: Infinity,
        repeatDelay: 0.4,
        repeatType: "reverse",
      },
    },
  },
}: TypewriterProps) => {
  const [displayText, setDisplayText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentTextIndex, setCurrentTextIndex] = useState(0)

  const texts = useMemo(() => (Array.isArray(text) ? text : [text]), [text])
  const containerRef = useRef<HTMLSpanElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-10% 0px" })
  const onCompleteRef = useRef(onComplete)
  const completedFiredRef = useRef(false)
  onCompleteRef.current = onComplete

  useEffect(() => {
    completedFiredRef.current = false
  }, [text])

  useEffect(() => {
    // We removed the isInView check to ensure it starts immediately, especially for navbars
    
    let timeout: NodeJS.Timeout

    const currentText = texts[currentTextIndex]

    const startTyping = () => {
      if (isDeleting) {
        if (displayText === "") {
          setIsDeleting(false)
          if (currentTextIndex === texts.length - 1 && !loop) {
            return
          }
          setCurrentTextIndex((prev) => (prev + 1) % texts.length)
          setCurrentIndex(0)
          timeout = setTimeout(() => {}, waitTime)
        } else {
          timeout = setTimeout(() => {
            setDisplayText((prev) => prev.slice(0, -1))
          }, deleteSpeed)
        }
      } else {
        if (currentText && currentIndex < currentText.length) {
          timeout = setTimeout(() => {
            const nextIndex = currentIndex + 1
            const nextDisplay = displayText + (currentText[currentIndex] || "")
            setDisplayText(nextDisplay)
            setCurrentIndex(nextIndex)
            if (
              !loop &&
              nextIndex >= currentText.length &&
              nextDisplay === currentText &&
              !completedFiredRef.current
            ) {
              completedFiredRef.current = true
              onCompleteRef.current?.()
            }
          }, speed)
        } else if (texts.length > 1 || loop) {
          timeout = setTimeout(() => {
            setIsDeleting(true)
          }, waitTime)
        }
      }
    }

    // Apply initial delay only at the start
    if (currentIndex === 0 && !isDeleting && displayText === "") {
      timeout = setTimeout(startTyping, initialDelay)
    } else {
      startTyping()
    }

    return () => clearTimeout(timeout)
  }, [
    currentIndex,
    displayText,
    isDeleting,
    speed,
    deleteSpeed,
    waitTime,
    texts,
    currentTextIndex,
    loop,
    isInView,
    initialDelay
  ])

  return (
    <span ref={containerRef} className={cn("inline whitespace-pre-wrap tracking-tight", className)}>
      <span>{displayText}</span>
      {showCursor && (
        <motion.span
          variants={cursorAnimationVariants}
          className={cn(
            cursorClassName,
            hideCursorOnType &&
              texts[currentTextIndex] &&
              (currentIndex < (texts[currentTextIndex]?.length || 0) || isDeleting)
              ? "hidden"
              : ""
          )}
          initial="initial"
          animate="animate"
        >
          {cursorChar}
        </motion.span>
      )}
    </span>
  )
}
