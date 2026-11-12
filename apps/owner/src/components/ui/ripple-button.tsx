"use client"

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react"

import { cn } from "@/lib/utils"

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string
  duration?: string
}

type RippleItem = {
  x: number
  y: number
  size: number
  key: number
}

function ButtonRipple({
  ripple,
  duration,
  rippleColor,
  onDone,
}: {
  ripple: RippleItem
  duration: string
  rippleColor: string
  onDone: (key: number) => void
}) {
  useEffect(() => {
    const timeout = setTimeout(
      () => {
        onDone(ripple.key)
      },
      parseInt(duration, 10)
    )

    return () => {
      clearTimeout(timeout)
    }
  }, [duration, onDone, ripple.key])

  return (
    <span
      className="animate-rippling bg-background absolute rounded-full opacity-30"
      style={
        {
          width: `${ripple.size}px`,
          height: `${ripple.size}px`,
          top: `${ripple.y}px`,
          left: `${ripple.x}px`,
          backgroundColor: rippleColor,
          transform: `scale(0)`,
          "--duration": duration,
        } as React.CSSProperties
      }
    />
  )
}

export const RippleButton = React.forwardRef<
  HTMLButtonElement,
  RippleButtonProps
>(
  (
    {
      className,
      children,
      rippleColor = "currentColor",
      duration = "600ms",
      onClick,
      ...props
    },
    ref
  ) => {
    const [buttonRipples, setButtonRipples] = useState<Array<RippleItem>>([])
    const nextKeyRef = useRef(0)

    const removeRipple = useCallback((key: number) => {
      setButtonRipples((prevRipples) =>
        prevRipples.filter((ripple) => ripple.key !== key)
      )
    }, [])

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) createRipple(event)
      onClick?.(event)
    }

    const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = (event.detail === 0 ? rect.width / 2 : event.clientX - rect.left) - size / 2
      const y = (event.detail === 0 ? rect.height / 2 : event.clientY - rect.top) - size / 2

      nextKeyRef.current += 1
      const newRipple = { x, y, size, key: nextKeyRef.current }
      setButtonRipples((prevRipples) => [...prevRipples, newRipple])
    }

    return (
      <button
        className={cn(
          "demo-ripple-button relative overflow-hidden",
          className
        )}
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        <span className="demo-ripple-content">{children}</span>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {buttonRipples.map((ripple) => (
            <ButtonRipple
              key={ripple.key}
              duration={duration}
              onDone={removeRipple}
              ripple={ripple}
              rippleColor={rippleColor}
            />
          ))}
        </span>
      </button>
    )
  }
)

RippleButton.displayName = "RippleButton"
