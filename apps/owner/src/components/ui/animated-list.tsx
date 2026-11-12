"use client"

// Adapted from Magic UI Animated List: operational records appear immediately,
// keep their supplied order, and only newly keyed records animate.
import React, {type ComponentPropsWithoutRef} from "react"
import {AnimatePresence, motion, useReducedMotion} from "motion/react"
import {cn} from "@/lib/utils"

export function AnimatedListItem({children}: {children: React.ReactNode}) {
  const reduced = useReducedMotion()
  return <motion.div initial={reduced ? false : {opacity: 0.85, y: 4}}
    animate={{opacity: 1, y: 0}} transition={{duration: reduced ? 0 : 0.18}}
    className="w-full min-w-0">{children}</motion.div>
}
export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {children: React.ReactNode}
export const AnimatedList = React.memo(({children, className, ...props}: AnimatedListProps) => (
  <div className={cn("flex min-w-0 flex-col", className)} {...props}>
    <AnimatePresence initial={false}>
      {React.Children.toArray(children).map(item => <AnimatedListItem key={(item as React.ReactElement).key}>{item}</AnimatedListItem>)}
    </AnimatePresence>
  </div>
))
AnimatedList.displayName = "AnimatedList"
