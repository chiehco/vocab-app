import { useEffect, useRef, useState, type ReactNode } from 'react';
import WordDetailScreen from '../../browser/WordDetailScreen';

export default function TownWordDrawer({ open, wordId, word, onClose, children }: {
  open: boolean; wordId?: string; word: string; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null), content = useRef<HTMLDivElement>(null);
  const [relatedId, setRelatedId] = useState<string>();
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  useEffect(() => { setRelatedId(undefined); content.current?.scrollTo(0, 0); }, [wordId, open]);
  return <dialog ref={dialog} className="town-word-drawer" aria-label={`${word} 字卡`} onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <header className="town-drawer-header"><span>LV1 · Unit 1</span><button onClick={() => dialog.current?.close()} autoFocus>關閉字卡 ×</button></header>
    <div className="town-drawer-scroll" ref={content} onClick={event => {
      // Follow related words inside the drawer, retaining the town and its camera.
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a');
      const match = anchor?.getAttribute('href')?.match(/^(?:#)?\/word\/([^?/#]+)$/);
      if (match && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        event.preventDefault(); setRelatedId(decodeURIComponent(match[1])); content.current?.scrollTo(0, 0);
      }
    }}>
      {open && <>
        {relatedId && <button className="town-drawer-back" onClick={() => setRelatedId(undefined)}>← 回到 {word}</button>}
        {(relatedId ?? wordId) ? <WordDetailScreen key={relatedId ?? wordId} embeddedWordId={relatedId ?? wordId} /> : <p>這個字尚未連到一般字卡。</p>}
        {!relatedId && <section className="town-drawer-practice" aria-label="小屋與補練">{children}</section>}
      </>}
    </div>
  </dialog>;
}
