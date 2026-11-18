import type { CSSProperties, ReactNode } from 'react';
import s from './Form.module.css';

/**
 * Form fields side by side on a wide screen, one under another on a phone. Labels of
 * different length wrap to different heights, so every cell sits on its bottom edge: the
 * inputs of a row always line up. `cols` is the most columns there will be; `min` is how
 * narrow a field may get before the row breaks.
 */
export function FieldGrid({ children, cols = 2, min = 200, style }: { children: ReactNode; cols?: number; min?: number; style?: CSSProperties }) {
  return (
    <div className={s.fields} style={{ '--cols': cols, '--min': `${min}px`, ...style } as CSSProperties}>
      {children}
    </div>
  );
}
