function Beast({ x = 120, y = 115, scale = 1, mood = "calm" }: { x?: number; y?: number; scale?: number; mood?: "calm" | "afraid" | "angry" | "baby" }) {
  return (
    <g className={`pilot-beast mood-${mood}`} transform={`translate(${x} ${y}) scale(${scale})`}>
      <path className="beast-body" d="M-32 28Q-38 0-22-27Q0-43 22-27Q38 0 32 28Q15 41 0 35Q-15 41-32 28Z" />
      <path d="M-18-26Q-29-43-37-27M18-26Q29-43 37-27" />
      {mood === "afraid" ? <><circle cx="-10" cy="-5" r="6" /><circle cx="10" cy="-5" r="6" /><path d="M-8 18Q0 8 8 18" /></> : mood === "angry" ? <><path d="M-18-11-5-5M18-11 5-5" /><circle cx="-10" cy="-2" r="3" /><circle cx="10" cy="-2" r="3" /><path d="M-10 18Q0 9 10 18" /></> : <><circle cx="-10" cy="-5" r="3.5" /><circle cx="10" cy="-5" r="3.5" /><path d="M-8 14Q0 20 8 14" /></>}
      <path d="M-15 35-19 47M15 35 19 47" />
    </g>
  );
}

function Destination({ x = 192, y = 112 }: { x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`}><circle r="29" /><circle r="11" /><path d="M-12 24 0 43 12 24" /></g>;
}

export default function Lv1PilotGlyph({ cue }: { cue: string }) {
  let drawing: React.ReactNode;
  switch (cue) {
    case "ability": drawing = <g className="ability-glyph"><Beast /><path d="M58 63h35v28H58zM165 55l17 34h-34zM61 156l30-22 22 30-30 18z" /><path d="M93 105 71 92M147 101l20-12M113 77 94 64" /></g>; break;
    case "able": drawing = <g className="able-glyph"><rect x="50" y="28" width="140" height="51" rx="8" /><Beast y={128} /><path d="M88 84 103 70M152 84l-15-14" /></g>; break;
    case "about": drawing = <g className="about-glyph"><Beast x={46} y={163} scale={.43} /><Beast x={194} y={163} scale={.43} /><path d="M77 35h86q18 0 18 18v46q0 18-18 18h-30l-13 17-13-17H77q-18 0-18-18V53q0-18 18-18z" /><circle className="about-topic" cx="120" cy="76" r="19" /><path d="m112 76 6 6 12-15M72 135l27-22M168 135l-27-22" /></g>; break;
    case "above": drawing = <g><rect x="49" y="134" width="142" height="30" rx="5" /><circle className="accent-fill" cx="120" cy="65" r="23" /><path d="m105 106 15-17 15 17" /></g>; break;
    case "abroad": drawing = <g className="abroad-glyph"><path d="M120 29v164" /><path d="M36 170h69M135 60h70" /><path d="m88 112 74-42M143 62l19 8-8 19" /><path d="M74 89h31v38H74zM83 89v-9h13v9" /></g>; break;
    case "across": drawing = <g className="across-glyph"><path d="M25 91h190M25 133h190" /><path d="M58 64v96M182 64v96" /><circle className="travelling-dot" cx="42" cy="112" r="11" /><path d="m172 92 22 20-22 20" /></g>; break;
    case "act": drawing = <g className="act-glyph"><path d="M25 175h190M46 175v-68h148v68" /><path d="M73 86q17-23 34 0v31q-17 21-34 0zM133 86q17-23 34 0v31q-17 21-34 0z" /><path d="M83 102q7 7 14 0M143 107q7-7 14 0" /><Beast x={120} y={157} scale={.55} /></g>; break;
    case "add": drawing = <g className="add-glyph"><circle cx="52" cy="110" r="18" /><circle cx="97" cy="110" r="18" /><path d="M130 110h27M143 96v28" /><circle className="accent-fill" cx="194" cy="82" r="14" /><circle className="accent-fill" cx="194" cy="110" r="14" /><circle className="accent-fill" cx="194" cy="138" r="14" /></g>; break;
    case "afraid": drawing = <g className="afraid-glyph"><Beast x={72} y={145} scale={.72} mood="afraid" /><path className="shadow-beast" d="M127 181q-24-66 7-112 32-46 70-5 25 36 9 117z" /><path d="m139 89 14 12M202 89l-14 12M157 131q16-17 32 0" /><path className="tremble" d="m39 103-13 12 14 10M62 85 51 97l13 9" /></g>; break;
    case "after": drawing = <g className="after-glyph"><path d="M31 112h178" /><circle cx="73" cy="112" r="22" /><circle className="accent-fill delayed" cx="167" cy="112" r="22" /><path d="M73 80V61M167 80V45M49 162h48M143 162h48" /></g>; break;
    case "age": drawing = <g className="age-glyph"><circle cx="120" cy="112" r="84" /><circle cx="120" cy="112" r="59" /><circle cx="120" cy="112" r="35" /><path d="M120 112 181 61" /><Beast x={61} y={151} scale={.38} mood="baby" /><Beast x={178} y={143} scale={.57} /></g>; break;
    case "air": drawing = <g className="air-glyph"><path className="air-balloon" d="M120 28c-43 0-72 34-66 75 5 35 30 58 56 69l10 18 10-18c26-11 51-34 56-69 6-41-23-75-66-75z" /><path d="m110 190 10 13 10-13M120 203v10" /><circle className="air-particle particle-one" cx="88" cy="79" r="7" /><circle className="air-particle particle-two" cx="126" cy="58" r="5" /><circle className="air-particle particle-three" cx="151" cy="97" r="8" /><circle className="air-particle particle-four" cx="104" cy="128" r="5" /><path className="air-current" d="M76 104q44 28 88 0M91 146q29 17 58 0" /></g>; break;
    case "all": drawing = <g className="all-glyph"><rect x="31" y="39" width="178" height="144" rx="24" /><circle cx="65" cy="77" r="10" /><circle cx="119" cy="69" r="10" /><circle cx="175" cy="83" r="10" /><circle cx="79" cy="133" r="10" /><circle cx="141" cy="126" r="10" /><circle cx="183" cy="151" r="10" /><path d="m42 156 16 15 33-35" /></g>; break;
    case "allow": drawing = <g className="allow-glyph"><path d="M84 38v145M155 38v145M84 53h71M84 168h71" /><path className="opening-gate" d="M84 55h50v108H84z" /><circle className="travelling-dot" cx="47" cy="110" r="13" /><path d="m167 90 22 20-22 20" /></g>; break;
    case "almost": drawing = <g className="almost-glyph"><path d="M29 141h181M188 42v145" /><path d="M38 131q59-95 132-45" /><circle className="accent-fill almost-dot" cx="170" cy="86" r="12" /><path d="M169 62V42" /></g>; break;
    case "along": drawing = <g className="along-glyph"><path d="M24 161Q72 29 125 108q43 64 91-17" /><path className="route-dash" d="M24 161Q72 29 125 108q43 64 91-17" /><circle className="travelling-dot" cx="29" cy="151" r="11" /><path d="m196 79 20 12-15 18" /></g>; break;
    case "always": drawing = <g className="always-glyph"><path d="M42 110q38-72 78 0 40 72 78 0-38-72-78 0-40 72-78 0z" /><circle cx="67" cy="85" r="8" /><circle cx="173" cy="135" r="8" /><path d="m115 56 13 10-16 8M125 165l-13-10 16-8" /></g>; break;
    case "angry": drawing = <g className="angry-glyph"><Beast y={125} mood="angry" /><path className="anger-ray" d="m69 65-22-20M91 47l-9-29M149 47l9-29M171 65l22-20M68 137l-31 8M172 137l31 8" /><path className="steam" d="M83 82q-18-20 0-35M157 82q18-20 0-35" /></g>; break;
    case "animal": drawing = <g className="animal-glyph"><path className="animal-body" d="M52 123q7-50 64-48 49 2 70 36l30-17-10 38-25 10-16 35-19-2-3-34H91l-8 35H62l-5-43-31-12z" /><circle cx="162" cy="103" r="4" /><path d="M57 94 43 67M150 80l14-28 18 34" /></g>; break;
    case "apple": drawing = <g className="apple-glyph"><path className="apple-body" d="M120 79q-37-35-69 3-31 38 7 92 31 43 62 17 31 26 62-17 38-54 7-92-32-38-69-3z" /><path d="M120 77q-6-37 18-54M126 50q30-20 54 1-31 25-54-1z" /></g>; break;
    case "arrive": drawing = <g className="arrive-glyph"><path d="M25 144q59-84 124-32" /><path className="route-dash" d="M25 144q59-84 124-32" /><circle className="travelling-dot" cx="33" cy="136" r="10" /><Destination x={181} y={104} /><path d="m143 90 25 14-19 22" /></g>; break;
    case "ask": drawing = <g className="ask-glyph"><Beast x={58} y={145} scale={.65} /><Beast x={189} y={145} scale={.65} /><path d="M74 41h91q17 0 17 17v36q0 17-17 17h-38l-15 17 3-17H74q-17 0-17-17V58q0-17 17-17z" /><text x="119" y="91" textAnchor="middle">?</text></g>; break;
    case "baby": drawing = <g className="baby-glyph"><path d="M49 135q71 61 142 0M49 135l13 48M191 135l-13 48" /><path d="M59 130q61-65 122 0" /><Beast y={113} scale={.48} mood="baby" /></g>; break;
    case "bank": drawing = <g className="bank-glyph"><path d="M23 31v164M120 31v164" /><path d="M37 95 73 67l36 28zM43 98h60M49 102v44M70 102v44M93 102v44M41 150h65" /><path d="M137 43q47 24 20 60-27 35 26 75M220 43q-47 24-20 60 27 35-26 75" /><path d="M162 93h32M166 126h30" /></g>; break;
    case "bear": drawing = <g className="bear-glyph"><rect x="48" y="28" width="144" height="52" rx="7" /><Beast y={131} /><path d="m84 90 18-18M156 90l-18-18" /><path className="bear-shadow" d="M168 182q31-30 19-68-12-36-41-26-25 9-22 45 3 33 44 49z" /><circle cx="145" cy="111" r="3" /></g>; break;
    case "begin": drawing = <g className="begin-glyph"><path d="M35 169h173M59 150V67" /><circle className="accent-fill" cx="59" cy="150" r="10" /><path className="sprout" d="M59 112q-36-7-37-39 32-1 37 25M60 91q35-10 41-42-35 1-42 28" /><path d="m188 149 20 20-20 20" /></g>; break;
    case "break": drawing = <g className="break-glyph"><path d="M28 110h69l15-24 19 49 18-25h63" /><path className="crack" d="M119 35 105 73l17 17-21 28 19 22-12 48" /><circle cx="71" cy="110" r="23" /><circle cx="174" cy="110" r="23" /></g>; break;
    case "bring": drawing = <g className="bring-glyph"><Beast x={74} y={138} scale={.7} /><rect x="88" y="93" width="45" height="39" rx="4" /><path d="M111 93V80M100 80h22" /><Destination x={190} y={112} /><path d="M125 156q22 13 47-8M160 136l12 12-14 10" /></g>; break;
    case "present": drawing = <g className="present-glyph"><path d="M80 28v164M160 28v164" /><rect x="17" y="92" width="48" height="48" rx="3" /><path d="M11 92h60V77H11zM41 77v63" /><circle cx="120" cy="110" r="27" /><path d="M120 92v18l13 9" /><path d="M177 145q19-20 39 0M184 78h27v51h-27z" /></g>; break;
    case "spring": drawing = <g className="spring-glyph"><path d="M80 28v164M160 28v164" /><path className="sprout" d="M38 157V86M38 112Q10 99 12 72q26 2 27 26M39 91q24-7 29-34-27 1-29 22" /><path className="coil" d="M91 155q57-13 0-30 57-13 0-30 57-13 23-31" /><g className="jumping"><Beast x={200} y={101} scale={.52} /></g><path d="M174 162q26 17 52 0" /></g>; break;
    default: drawing = <g><circle cx="120" cy="110" r="74" /><path d="m72 110 31 30 66-73" /></g>;
  }
  return <svg className={`lv1-pilot-glyph cue-${cue}`} viewBox="0 0 240 220" role="img" aria-label="尚未解鎖的圖片">{drawing}</svg>;
}
