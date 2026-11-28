import { useState } from 'react';
import { finishWordBankAttempt, setWordBankChoice, startWordBankAttempt, wordBankView,
  type WordBankContent, type WordBankAttempt } from './wordBankView';

type Props = Readonly<{ content: WordBankContent; attemptKey: string }>;

// Standalone guided preview only. The caller must supply reviewed content and a
// new attemptKey when changing passage. No route, persistence or rewards here.
export default function GuidedWordBankPanel({ content, attemptKey }: Props) {
  return <GuidedAttempt key={attemptKey} content={content} />;
}

function prepareGuidedAttempt(content: WordBankContent): WordBankAttempt | null {
  try {
    const attempt = startWordBankAttempt(content, 'guided');
    const { stage } = attempt;
    if (content.blanks.length !== 5 || stage.optionIds.length !== 5 ||
        stage.showPos !== true || stage.showBlankHints !== true ||
        stage.feedback !== 'after_blank' ||
        content.blanks.some(b => typeof b.guideHint !== 'string' || !b.guideHint.trim()) ||
        stage.optionIds.some(id => {
          const pos = content.options.find(o => o.id === id)?.pos;
          return typeof pos !== 'string' || !pos.trim();
        })) return null;
    return attempt;
  } catch {
    return null;
  }
}

function GuidedAttempt({ content }: { content: WordBankContent }) {
  const [initial] = useState(() => prepareGuidedAttempt(content));
  if (!initial) return <section aria-label="引導式文意選填">
    <p role="alert">這篇練習的資料不完整，暫時無法作答。</p>
  </section>;
  return <GuidedSession initial={initial} />;
}

function GuidedSession({ initial }: { initial: WordBankAttempt }) {
  const [attempt, setAttempt] = useState(initial);
  const [selected, setSelected] = useState(() => attempt.state.slots[0].index);
  const view = wordBankView(attempt);
  const active = view.blanks.find(blank => blank.index === selected);
  function restart() {
    setAttempt(initial);
    setSelected(initial.state.slots[0].index);
  }
  return <section aria-label="引導式文意選填">
    <h2>引導式文意選填</h2>
    <p>先選空格，再選單字。可清除或替換；每個單字只能使用一次。</p>
    <p lang="en" style={{ lineHeight: 2.5 }}>
      {view.segments.map((segment, i) => {
        if (segment.kind === 'text') return <span key={i}>{segment.text}</span>;
        const blank = view.blanks.find(item => item.index === segment.index)!;
        return <button key={i} type="button" data-blank={blank.index}
          aria-label={`第 ${blank.index} 空：${blank.chosen ?? '未作答'}`}
          aria-pressed={selected === blank.index} disabled={view.submitted}
          onClick={() => setSelected(blank.index)}
          style={{ minHeight: 44, padding: '4px 8px', margin: '2px', border: '1px solid currentColor',
            outline: selected === blank.index ? '2px solid currentColor' : undefined }}>
          ({blank.index}) {blank.chosen ?? '___'}
        </button>;
      })}
    </p>
    <p role="status">第 {selected} 空{active?.hint ? `：${active.hint}` : ''}</p>
    <div aria-label="詞庫" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {view.options.map(option => <button key={option.id} type="button" data-option={option.id}
        disabled={view.submitted || !option.available}
        onClick={() => setAttempt(current => setWordBankChoice(current, selected, option.id))}
        style={{ minHeight: 44, padding: '4px 8px', border: '1px solid currentColor' }}>
        <span lang="en">{option.id}</span>{option.pos ? ` (${option.pos})` : ''}
      </button>)}
    </div>
    <button type="button" data-action="clear" disabled={view.submitted || !active?.chosen}
      onClick={() => setAttempt(current => setWordBankChoice(current, selected, null))}>清除本空</button>
    <div aria-label="作答解析">
      {view.blanks.map(blank => blank.feedback ? <details key={blank.index} open={blank.index === selected || view.submitted}
        data-feedback={blank.index}>
        <summary>第 {blank.index} 空：{blank.feedback.correct ? '正確' : '再想想'}</summary>
        <p>正解：<span lang="en">{blank.feedback.answer}</span></p>
        <ul>{blank.feedback.reviews.map(review => <li key={review.id}>
          <span lang="en">{review.id}</span>：{review.reasonZh}
        </li>)}</ul>
      </details> : null)}
    </div>
    <p>已填 {view.blanks.filter(blank => blank.chosen !== null).length} / {view.blanks.length} 空</p>
    <button type="button" data-action="submit" disabled={!view.canSubmit}
      onClick={() => setAttempt(finishWordBankAttempt)}>整篇交卷</button>
    {view.score && <p role="status" data-score>答對 {view.score.correct} / {view.score.total} 空</p>}
    <button type="button" data-action="restart" onClick={restart}>重新練習</button>
  </section>;
}
