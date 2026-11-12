"use client";

import {forwardRef, type ComponentPropsWithoutRef} from 'react';
import {RippleButton} from '../ui/ripple-button';
import {InteractiveHoverButton} from '../ui/interactive-hover-button';
import {useDemoUI} from './demo-context';

export type DemoButtonProps = ComponentPropsWithoutRef<'button'> & {effect?: 'ripple' | 'primary' | 'none'};

/** Always one native button. Live controls keep their exact existing markup. */
export const DemoButton = forwardRef<HTMLButtonElement, DemoButtonProps>(function DemoButton(
  {effect = 'ripple', className, ...props}, ref,
) {
  const demo = useDemoUI();
  if (!demo || effect === 'none' || props['aria-haspopup'] || props.role === 'switch' || className?.includes('danger') || className?.includes('icon-button')) {
    return <button ref={ref} className={className} {...props}/>;
  }
  const classes = `demo-magic-button ${className ?? ''}`;
  if (effect === 'primary') return <InteractiveHoverButton ref={ref} className={classes} {...props}/>;
  return <RippleButton ref={ref} className={classes} rippleColor="currentColor" duration="420ms" {...props}/>;
});
