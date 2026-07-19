import type { PriestTrial } from "./priestTrials";

function Beast({ x = 100, y = 92, small = false }: { x?: number; y?: number; small?: boolean }) {
  const s = small ? 0.72 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="ink-beast">
      <path d="M-29 25 Q-35 -4 -17 -25 Q0 -38 17 -25 Q35 -4 29 25 Q12 36 0 31 Q-12 36 -29 25Z" />
      <circle cx="-9" cy="-6" r="3.5" /><circle cx="9" cy="-6" r="3.5" />
      <path d="M-12 30 L-17 39 M12 30 L17 39" />
    </g>
  );
}

function PolyCue({ word, sense = 0 }: { word: string; sense?: number }) {
  if (word === "spring") {
    return sense === 0 ? <g className="cue-grow"><path d="M100 145 V83" /><path d="M99 101 Q72 90 70 67 Q96 68 100 91" /><path d="M101 83 Q126 75 130 53 Q104 53 100 74" /><path d="M52 146 H150" /></g>
      : sense === 1 ? <g className="cue-spring"><path d="M58 130 Q142 113 58 96 Q142 79 58 62 Q142 45 86 31" /><path d="M48 139 H153 M78 25 H122" /></g>
      : <g className="cue-jump"><Beast y={80} small /><path d="M75 142 Q100 160 125 142" /><path d="M67 123 Q50 101 59 80 M133 123 Q150 101 141 80" /></g>;
  }
  if (word === "bank") {
    return sense === 0 ? <g><path d="M50 74 L100 39 L150 74 Z M57 76 H143 M65 78 V132 M88 78 V132 M112 78 V132 M135 78 V132 M52 135 H148" /><circle cx="100" cy="104" r="12" /><path d="M100 95 V113 M94 99 H104 Q111 100 104 104 Q91 107 98 112 H108" /></g>
      : <g className="cue-river"><path d="M24 40 Q76 62 51 91 Q25 119 73 150" /><path d="M176 40 Q124 62 149 91 Q175 119 127 150" /><path d="M68 51 Q100 63 132 51 M62 92 Q100 105 138 92 M72 133 Q100 145 128 133" /></g>;
  }
  if (word === "present") {
    return sense === 0 ? <g className="cue-gift"><rect x="51" y="69" width="98" height="76" rx="4" /><path d="M45 69 H155 V48 H45 Z M100 48 V145 M77 47 Q62 28 75 25 Q94 24 100 47 M123 47 Q138 28 125 25 Q106 24 100 47" /></g>
      : sense === 1 ? <g className="cue-now"><path d="M22 96 H178" /><circle cx="100" cy="96" r="25" /><path d="M100 48 V68 M100 124 V144 M34 83 L22 96 L34 109 M166 83 L178 96 L166 109" /></g>
      : <g className="cue-present"><path d="M39 119 Q62 103 82 114 M161 119 Q138 103 118 114" /><rect x="77" y="50" width="46" height="57" rx="5" /><path d="M89 67 H111 M89 80 H111 M89 93 H105" /></g>;
  }
  if (word === "bear") {
    return sense === 0 ? <g className="cue-bear-weight"><rect x="42" y="24" width="116" height="49" rx="7" /><Beast y={110} /><path d="M69 76 L82 64 M131 76 L118 64" /></g>
      : <g className="cue-bear"><circle cx="67" cy="54" r="19" /><circle cx="133" cy="54" r="19" /><path d="M52 80 Q49 42 100 39 Q151 42 148 80 V126 Q128 151 100 146 Q72 151 52 126Z" /><circle cx="78" cy="87" r="5" /><circle cx="122" cy="87" r="5" /><path d="M86 116 Q100 125 114 116" /></g>;
  }
  return sense === 0 ? <g className="cue-fee"><rect x="45" y="36" width="110" height="118" rx="4" /><path d="M64 62 H136 M64 82 H122 M64 102 H111" /><circle cx="125" cy="127" r="20" /><path d="M125 112 V142 M116 118 H130 Q141 121 129 127 Q113 132 124 137 H136" /></g>
    : sense === 1 ? <g className="cue-charge"><Beast x={77} y={94} /><path d="M112 95 H178 M153 73 L178 95 L153 117" /><path d="M42 61 L25 52 M38 78 L17 76 M42 119 L24 130" /></g>
    : <g className="cue-electric"><circle cx="55" cy="94" r="28" /><circle cx="145" cy="94" r="28" /><path d="M45 94 H65 M55 84 V104 M135 94 H155" /><path d="M85 52 L70 96 H95 L83 140 L132 82 H106 L119 52Z" /></g>;
}

function InkCue({ cue }: { cue: string }) {
  switch (cue) {
    case "burden": return <g className="cue-burden"><rect x="36" y="27" width="128" height="56" rx="8" /><Beast y={116} /><path d="M66 86 L80 75 M134 86 L120 75" /></g>;
    case "melt": return <g className="cue-melt"><path d="M52 35 H148 V101 Q137 94 128 112 Q118 132 107 101 Q97 85 87 112 Q73 139 66 100 Q59 90 52 101Z" /><ellipse cx="100" cy="145" rx="69" ry="14" /></g>;
    case "hesitate": return <g className="cue-hesitate"><path d="M100 154 V103 M100 103 L48 51 M100 103 L152 51" /><path d="M38 61 L48 51 L58 61 M142 61 L152 51 L162 61" /><g className="hesitant"><Beast y={105} small /></g><path className="ghost" d="M76 132 Q100 143 124 132" /></g>;
    case "imply": return <g className="cue-imply"><path d="M35 43 H126 Q146 43 146 63 V91 Q146 111 126 111 H84 L61 132 L65 111 H35 Q15 111 15 91 V63 Q15 43 35 43Z" /><circle cx="49" cy="77" r="5" /><circle cx="71" cy="77" r="5" /><circle cx="93" cy="77" r="5" /><path className="hidden-ink" d="M84 119 Q121 127 171 104 M143 92 L171 104 L150 124" /></g>;
    case "slippery": return <g className="cue-slippery"><path d="M32 139 L168 51" /><path d="M51 126 Q77 132 94 117 M84 104 Q110 110 127 95" /><g className="sliding"><Beast x={115} y={77} small /></g><path d="M36 151 H164" /></g>;
    case "fragile": return <g className="cue-fragile"><path d="M58 40 H142 L134 137 Q100 153 66 137Z" /><path className="crack" d="M108 40 L96 68 L111 85 L91 105 L101 145" /></g>;
    case "transparent": return <g className="cue-transparent"><path className="grid" d="M23 42 H177 M23 76 H177 M23 110 H177 M23 144 H177 M40 25 V161 M80 25 V161 M120 25 V161 M160 25 V161" /><Beast y={95} /></g>;
    case "vague": return <g className="cue-vague"><g transform="translate(-9 2)"><Beast y={94} /></g><g transform="translate(9 -2)"><Beast y={94} /></g><Beast y={94} /></g>;
    case "justice": return <g className="cue-justice"><path d="M100 32 V145 M57 145 H143 M47 58 H153 M100 43 L47 58 M100 43 L153 58" /><path d="M47 58 L27 109 H67 Z M153 58 L133 109 H173 Z" /></g>;
    case "fate": return <g className="cue-fate"><circle cx="37" cy="48" r="12" /><circle cx="163" cy="139" r="12" /><path d="M37 48 C128 31 62 160 163 139" /><circle cx="91" cy="84" r="7" /><circle cx="111" cy="118" r="7" /></g>;
    case "instinct": return <g className="cue-instinct"><Beast y={98} /><circle className="core" cx="100" cy="97" r="13" /><path d="M100 78 V56 M119 84 L137 68 M81 84 L63 68 M119 109 L142 118" /></g>;
    case "tendency": return <g className="cue-tendency"><path d="M25 44 C69 55 86 77 166 66 M25 88 C72 88 100 104 166 101 M25 137 C83 130 103 127 166 142" /><path d="M151 53 L166 66 L149 76 M150 88 L166 101 L148 111 M151 130 L166 142 L148 151" /><circle className="counter" cx="80" cy="119" r="7" /></g>;
    case "beneath": return <g className="cue-relation"><rect x="42" y="44" width="116" height="28" rx="5" /><circle cx="100" cy="124" r="22" /><path d="M100 82 V96 M90 88 L100 98 L110 88" /></g>;
    case "beyond": return <g className="cue-beyond"><path d="M91 29 V157" /><circle className="traveller" cx="55" cy="94" r="17" /><path d="M38 129 H168 M150 112 L168 129 L150 146" /></g>;
    case "throughout": return <g className="cue-throughout"><rect x="30" y="34" width="140" height="120" rx="18" /><circle cx="53" cy="59" r="7" /><circle cx="94" cy="49" r="7" /><circle cx="145" cy="64" r="7" /><circle cx="70" cy="96" r="7" /><circle cx="122" cy="95" r="7" /><circle cx="48" cy="132" r="7" /><circle cx="98" cy="139" r="7" /><circle cx="151" cy="126" r="7" /></g>;
    case "barely": return <g className="cue-barely"><path d="M31 130 H169 M148 39 V151" /><path className="barely-line" d="M38 117 Q89 46 152 67" /><circle cx="151" cy="67" r="10" /><path d="M139 28 L148 39 L157 28" /></g>;
    case "seldom": return <g className="cue-seldom"><path d="M22 132 H178" /><path d="M37 121 V143 M70 126 V138 M103 121 V143 M136 126 V138 M169 121 V143" /><g className="footprints"><ellipse cx="39" cy="81" rx="10" ry="15" transform="rotate(-18 39 81)" /><ellipse cx="101" cy="59" rx="10" ry="15" transform="rotate(13 101 59)" /><ellipse cx="164" cy="92" rx="10" ry="15" transform="rotate(-12 164 92)" /></g></g>;
    default: return <g><Beast y={94} /><circle className="core" cx="100" cy="94" r="9" /></g>;
  }
}

export default function PriestCueVisual({ trial, sense = 0, compact = false }: { trial: PriestTrial; sense?: number; compact?: boolean }) {
  if (trial.image) return <img className="priest-cue-image" src={trial.image} alt={`${trial.word}：${trial.meaning}`} />;
  return (
    <svg className={`priest-cue-svg ${compact ? "compact" : ""}`} viewBox="0 0 200 180" role="img" aria-label={`${trial.word} 的記憶圖像`}>
      {trial.senses ? <PolyCue word={trial.word} sense={sense} /> : <InkCue cue={trial.cue} />}
    </svg>
  );
}
