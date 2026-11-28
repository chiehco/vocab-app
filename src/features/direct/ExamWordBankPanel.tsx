import { useState } from 'react';
import { finishWordBankAttempt, setWordBankChoice, startWordBankAttempt, wordBankView,
  type WordBankContent, type WordBankAttempt } from './wordBankView';

type Props = Readonly<{ content: WordBankContent; attemptKey: string }>;

// Standalone exam preview only. The caller must supply reviewed content and a
// new attemptKey when changing passage. No route, persistence or rewards here.
export default function ExamWordBankPanel({ content, attemptKey }: Props) {
  return <ExamAttempt key={attemptKey} content={content} />;
}

function prepareExamAttempt(content: WordBankContent): WordBankAttempt | null {
  try {
    const attempt = startWordBankAttempt(content, 'exam');
    const { stage } = attempt;
    if (content.blanks.length !== 10 || stage.optionIds.length !== 10 ||
        content.blanks.some((b, i) => b.index !== i + 1) ||
        stage.showPos !== false || stage.showBlankHints !== false ||
        stage.feedback !== 'after_passage_submit') return null;
    return attempt;
  } catch {
    return null;
  }
}

function ExamAttempt({ content }: { content: WordBankContent }) {
  const [initial] = useState(() => prepareExamAttempt(content));
  if (!initial) return <section aria-label="考試式文意選填">
    <p role="alert">這篇練習的資料不完整，暫時無法作答。</p>
  </section>;
  return <ExamSession initial={initial} />;
}

function ExamSession({ initial }: { initial: WordBankAttempt }) {
  const [attempt, setAttempt] = useState(initial);
  const [selected, setSelected] = useState(() => attempt.state.slots[0].index);
  const view = wordBankView(attempt);
  const active = view.blanks.find(blank => blank.index === selected);
  function restart() {
    setAttempt(initial);
    setSelected(initial.state.slots[0].index);
  }
  return <section aria-label="考試式文意選填">
    <h2>考試式文意選填</h2>
    <p>十空十選，每個單字只能使用一次。可清除或替換，整篇交卷後才顯示答案與解析。</p>
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
    <p role="status">第 {selected} 空</p>
    <div aria-label="詞庫" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {view.options.map(option => <button key={option.id} type="button" data-option={option.id}
        disabled={view.submitted || !option.available}
        onClick={() => setAttempt(current => setWordBankChoice(current, selected, option.id))}
        style={{ minHeight: 44, padding: '4px 8px', border: '1px solid currentColor' }}>
        <span lang="en">{option.id}</span>
      </button>)}
    </div>
    <button type="button" data-action="clear" disabled={view.submitted || !active?.chosen}
      onClick={() => setAttempt(current => setWordBankChoice(current, selected, null))}>清除本空</button>
    {view.submitted && <div aria-label="作答解析">
      {view.blanks.map(blank => blank.feedback ? <details key={blank.index} open
        data-feedback={blank.index}>
        <summary>第 {blank.index} 空：{blank.feedback.correct ? '正確' : '錯誤'}</summary>
        <p>正解：<span lang="en">{blank.feedback.answer}</span></p>
        <ul>{blank.feedback.reviews.map(review => <li key={review.id}>
          <span lang="en">{review.id}</span>：{review.reasonZh}
        </li>)}</ul>
      </details> : null)}
    </div>}
    <p>已填 {view.blanks.filter(blank => blank.chosen !== null).length} / {view.blanks.length} 空</p>
    <button type="button" data-action="submit" disabled={!view.canSubmit}
      onClick={() => setAttempt(finishWordBankAttempt)}>整篇交卷</button>
    {view.score && <p role="status" data-score>答對 {view.score.correct} / {view.score.total} 空</p>}
    <button type="button" data-action="restart" onClick={restart}>重新練習</button>
  </section>;
}
