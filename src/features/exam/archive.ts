import archive from './gsatArchive.json';

export interface ExamQuestion {
  question_id:string; number:number|null; question_type:string; passage_id:string|null;
  stem:string; instruction:string|null; options:Record<string,string>|null; points:number;
  answer:{kind:string;value?:string|string[];official?:string|null}; sourcePage:number;
  explanationZh:string; distractorNotesZh:string; has_figure:boolean;
  referenceText?:string; referenceLabel?:string; rubricText?:string; answerKey?:string;
}
export interface ExamPassage {
  passage_id:string; text:string; question_ids:string[]; label:string;
  option_pool:Record<string,string>|null; sourcePages?:number[]; needsOriginal?:boolean;
}
export interface WrittenGroup {
  id:string; year:string; title:string; ids:string[]; passageId?:string; sourcePages?:number[];
}
interface Archive {
  questions:ExamQuestion[]; passages:ExamPassage[]; writtenQuestions:ExamQuestion[];
  writtenPassages:ExamPassage[]; writtenGroups:WrittenGroup[];
  years:{year:string;pageImages:Record<string,string>;rubricPdf:string;vocabularyCount:number;singleCount:number;totalRecords:number}[];
}
export const examArchive=archive as unknown as Archive;
export const yearMetadata=(year:string)=>examArchive.years.find(y=>y.year===year);
export const originalImages=(year:string,pages:number[]=[])=>pages.map(p=>yearMetadata(year)?.pageImages[String(p)]).filter((p):p is string=>!!p);
export const examAsset=(path:string)=>`${import.meta.env.BASE_URL}${path}`;
