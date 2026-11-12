"use client"

import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

export function InteractiveHoverButton({
  children,
  className,
  ...props
}: React.ComponentPropsWithRef<"button">) {
  return (
    <button
      className={cn(
        "group demo-hover-button relative overflow-hidden",
        className
      )}
      {...props}
    >
      <span className="demo-hover-content">
        <span className="demo-hover-fill" aria-hidden="true"/>
        <span className="demo-hover-label">
          {children}
        </span>
      </span>
      <span aria-hidden="true" className="demo-hover-overlay">
        <span>{children}</span>
        <ArrowRight aria-hidden="true"/>
      </span>
    </button>
  )
}
