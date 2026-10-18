import { useEffect, useRef, useState, type ReactNode } from 'react';
import './study-actions.css';

/** Keep explicit study actions above the app navigation; reserve their actual height. */
export default function StudyActions({ children, label }: { children: ReactNode; label: string }) {
  const dock = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!dock.current) return;
    const element = dock.current;
    const measure = () => setHeight(element.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className="study-actions-space" style={{ minHeight: height || undefined }}>
    <div className="study-actions-dock" ref={dock} role="group" aria-label={label}>{children}</div>
  </div>;
}
