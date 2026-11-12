"use client"

// Magic UI Smooth Cursor, adapted for demo-only use, editable fields and the
// browser top layer. Physics use the upstream spring model; no pointer events
// are intercepted and the native cursor is hidden only after a successful show.
import {useEffect, useRef, useState, type ReactNode} from "react"
import {motion, useSpring} from "motion/react"

export interface SmoothCursorProps {
  cursor?: ReactNode
  springConfig?: {damping: number; stiffness: number; mass: number; restDelta: number}
}
const DESKTOP_POINTER_QUERY = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)"

export function SmoothCursor({cursor, springConfig = {damping: 45, stiffness: 400, mass: 1, restDelta: 0.001}}: SmoothCursorProps) {
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)
  const element = useRef<HTMLDivElement>(null)
  const showing = useRef(false)
  const x = useSpring(0, springConfig)
  const y = useSpring(0, springConfig)
  useEffect(() => {
    const media = matchMedia(DESKTOP_POINTER_QUERY)
    const sync = () => setEnabled(media.matches && typeof PointerEvent !== "undefined" && typeof HTMLElement.prototype.showPopover === "function")
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])
  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    let activeDialog: Element | null = null
    const hide = () => {
      showing.current = false
      activeDialog = null
      setVisible(false)
      delete root.dataset.smoothCursor
      element.current?.hidePopover()
    }
    const move = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (event.pointerType !== "mouse" || target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),iframe') || window.getSelection()?.isCollapsed === false) {
        hide()
        return
      }
      const el = element.current
      if (!el) return
      const dialog = target?.closest('dialog[open]') ?? null
      if (showing.current && dialog !== activeDialog) {
        el.hidePopover()
        try { el.showPopover() } catch { hide(); return }
      }
      activeDialog = dialog
      if (!showing.current) {
        x.jump(event.clientX)
        y.jump(event.clientY)
        try { el.showPopover() } catch { hide(); return }
        if (!el.matches(":popover-open")) return
        showing.current = true
        setVisible(true)
        root.dataset.smoothCursor = "true"
      }
      x.set(event.clientX)
      y.set(event.clientY)
    }
    const leave = (event: PointerEvent) => {if (!event.relatedTarget) hide()}
    const keys = (event: KeyboardEvent) => {if (event.key === "Tab" || event.key === "Escape") hide()}
    const visibility = () => {if (document.hidden) hide()}
    window.addEventListener("pointermove", move, {passive: true})
    window.addEventListener("pointerout", leave)
    window.addEventListener("blur", hide)
    window.addEventListener("keydown", keys)
    document.addEventListener("visibilitychange", visibility)
    return () => {
      hide()
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerout", leave)
      window.removeEventListener("blur", hide)
      window.removeEventListener("keydown", keys)
      document.removeEventListener("visibilitychange", visibility)
    }
  }, [enabled, x, y])
  if (!enabled) return null
  return <motion.div ref={element} popover="manual" aria-hidden="true" className="demo-smooth-cursor"
    data-visible={visible} style={{position: "fixed", left: 0, top: 0, x, y, pointerEvents: "none", opacity: visible ? 1 : 0}}
    initial={false}>{cursor}</motion.div>
}
