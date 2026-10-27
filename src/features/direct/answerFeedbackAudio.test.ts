import { expect,it,vi } from 'vitest';
import { AnswerFeedbackAudio } from './answerFeedbackAudio';
function fakeContext(state='running') {
 const frequencies:number[]=[],nodes: {stop:ReturnType<typeof vi.fn>}[]=[];
 const ctx={state,currentTime:0,destination:{},resume:vi.fn(async()=>{ctx.state='running'}),close:vi.fn(async()=>{ctx.state='closed'}),
  createOscillator:vi.fn(()=>{const o={type:'',frequency:{setValueAtTime:(n:number)=>frequencies.push(n)},connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};nodes.push(o);return o}),
  createGain:vi.fn(()=>({connect:vi.fn(),disconnect:vi.fn(),gain:{setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()}}))};
 return {ctx,frequencies,nodes,audio:ctx as unknown as AudioContext};
}
it('creates no context before a gesture and schedules distinct soft tones once per new result',async()=>{
 const f=fakeContext(),create=vi.fn(()=>f.audio),p=new AnswerFeedbackAudio(()=>true,create);expect(create).not.toHaveBeenCalled();
 const permit=p.prepare();expect(create).toHaveBeenCalledTimes(1);expect(f.frequencies).toEqual([]);
 expect(await p.playOnce('a',true,permit)).toBe(true);expect(f.frequencies).toEqual([392,523.25]);
 expect(await p.playOnce('a',false,permit)).toBe(false);await p.playOnce('b',false,permit);expect(f.frequencies.slice(2)).toEqual([261.63,220]);
});
it('resumes within prepare, then rechecks mute after delayed readiness and stops scheduled nodes',async()=>{
 let enabled=true;const f=fakeContext('suspended');let release!:()=>void;
 f.ctx.resume.mockImplementationOnce(()=>new Promise<void>(r=>{release=()=>{f.ctx.state='running';r()}}));
 const p=new AnswerFeedbackAudio(()=>enabled,()=>f.audio),permit=p.prepare();expect(f.ctx.resume).toHaveBeenCalledTimes(1);
 const result=p.playOnce('a',true,permit);enabled=false;release();expect(await result).toBe(false);expect(f.frequencies).toEqual([]);
 enabled=true;await p.playOnce('b',true,p.prepare());p.silence();expect(f.nodes.every(n=>n.stop.mock.calls.length===2)).toBe(true);
});
it('remains silent on unsupported or rejected autoplay and after disposal',async()=>{
 expect(new AnswerFeedbackAudio(()=>false,()=>{throw Error('should not create')}).prepare()).toBeUndefined();
 const unavailable=new AnswerFeedbackAudio(()=>true,()=>undefined);expect(await unavailable.playOnce('a',false,unavailable.prepare())).toBe(false);
 const f=fakeContext('suspended');f.ctx.resume.mockRejectedValueOnce(Error('blocked'));const p=new AnswerFeedbackAudio(()=>true,()=>f.audio);expect(await p.playOnce('a',true,p.prepare())).toBe(false);
 const permit=p.prepare();p.dispose();expect(await p.playOnce('b',false,permit)).toBe(false);
});
