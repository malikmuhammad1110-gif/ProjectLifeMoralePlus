"use client";
import { useState } from 'react';
type Answer={score?:number;scenarioScore?:number;note?:string};
type TimeRow={category:string;hours:number;ri:number};
const QUESTIONS=[
"Life direction","Alignment with values","Sense of purpose","Personal growth","Pride in challenges",
"Emotional connection","Support from close people","Romantic/intimate fulfillment","Contribution to others","Authentic self-expression",
"Control over time","Meaningfulness of work/responsibility","Manageable workload/routine","Freedom to choose","Financial security",
"Physical health & energy","Rest & sleep quality","Eating & self-care habits","Motivation to care for body","Comfort/confidence in own skin",
"Stress/anxiety management","Emotional balance/calm","Hope about the future","Inner peace/contentment"
];
const CATS:TimeRow[]=[
{category:'Sleep',hours:49,ri:5},{category:'Work',hours:0,ri:5},{category:'Commute',hours:0,ri:5},{category:'Relationships',hours:0,ri:5},
{category:'Leisure',hours:0,ri:5},{category:'Gym',hours:0,ri:5},{category:'Chores',hours:0,ri:5},{category:'Growth',hours:0,ri:5},{category:'Other',hours:0,ri:5},
];
export default function AssessmentPage(){
const [answers,setAnswers]=useState<Answer[]>(Array(24).fill({}));
const [timeMap,setTimeMap]=useState<TimeRow[]>(CATS);
const [ELI,setELI]=useState<number>(1);
const [result,setResult]=useState<any>(null);
const [crossLift,setCrossLift]=useState<boolean>(false);
const [riMult,setRiMult]=useState<number>(1);
const [calMax,setCalMax]=useState<number>(8.75);
const totalHours=timeMap.reduce((a,b)=>a+b.hours,0);
const remaining=168-totalHours;
function updateAnswer(i:number,field:'score'|'scenarioScore'|'note',value:any){const next=[...answers];next[i]={...next[i],[field]:field==='note'?String(value): (value?Number(value):undefined)};setAnswers(next);}
function updateTime(i:number,field:'hours'|'ri',value:any){const next=[...timeMap];next[i]={...next[i],[field]:Number(value)} as any;setTimeMap(next);}
async function submit(){
const payload={answers,timeMap,ELI,config:{calibration:{k:1.936428228,max:calMax},ri:{globalMultiplier:riMult},crossLift:{enabled:crossLift,alpha:20}}};
const res=await fetch('/api/score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
setResult(await res.json());
}
return(<main style={{padding:24,maxWidth:980,margin:'0 auto'}}>
<h2>Life Morale Assessment</h2>
<section style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
<div><h3>Survey (1–10)</h3><table style={{width:'100%'}}><thead><tr><th>#</th><th>Question</th><th>Score</th><th>Scenario</th></tr></thead>
<tbody>{QUESTIONS.map((q,i)=>(<tr key={i}><td>{i+1}</td><td>{q}</td>
<td><input type='number' min={1} max={10} value={answers[i].score ?? ''} onChange={e=>updateAnswer(i,'score',e.target.value)} style={{width:64}}/></td>
<td><input type='number' min={1} max={10} value={answers[i].scenarioScore ?? ''} onChange={e=>updateAnswer(i,'scenarioScore',e.target.value)} style={{width:64}}/></td>
</tr>))}</tbody></table></div>
<div><h3>Time Map (hrs / week)</h3><table style={{width:'100%'}}><thead><tr><th>Category</th><th>Hours</th><th>RI (1–10)</th></tr></thead>
<tbody>{timeMap.map((row,i)=>(<tr key={row.category}><td>{row.category}</td>
<td><input type='number' min={0} value={row.hours} onChange={e=>updateTime(i,'hours',e.target.value)} style={{width:80}}/></td>
<td><input type='number' min={1} max={10} value={row.ri} onChange={e=>updateTime(i,'ri',e.target.value)} style={{width:80}}/></td>
</tr>))}</tbody></table>
<p style={{fontWeight:600,color:remaining===0?'green':remaining>0?'orangered':'crimson'}}>{remaining===0?'✅ All set (168/168)':remaining>0?`Allocate ${remaining} more hrs`:`Over by ${-remaining} hrs`}</p>
<div style={{marginTop:12}}><label>ELI (1–10): <input type='number' min={1} max={10} value={ELI} onChange={e=>setELI(Number(e.target.value||1))} style={{width:64}}/></label></div>
<div style={{marginTop:12}}><label><input type='checkbox' checked={crossLift} onChange={e=>setCrossLift(e.target.checked)}/> Enable Cross‑Lift</label></div>
<div style={{marginTop:8}}><label>RI Global Multiplier: <input type='number' step={0.1} value={riMult} onChange={e=>setRiMult(Number(e.target.value))} style={{width:80}}/></label></div>
<div style={{marginTop:8}}><label>Calibration Max (10 → …): <input type='number' step={0.05} value={calMax} onChange={e=>setCalMax(Number(e.target.value))} style={{width:100}}/></label></div>
</div></section>
<button onClick={submit} style={{marginTop:16,padding:'10px 16px'}}>Calculate LMI</button>
{result&&(<section style={{marginTop:24}}>
<h3>Results</h3>
<p><b>Raw LMS:</b> {result.rawLMS?.toFixed(2)} &nbsp; <b>RI‑adjusted:</b> {result.riAdjusted?.toFixed(2)} &nbsp; <b>Final LMI:</b> {result.finalLMI?.toFixed(2)}</p>
<p><b>Scenario — Raw:</b> {result.rawLMS_scn?.toFixed(2)} &nbsp; <b>RI‑adjusted:</b> {result.riAdjusted_scn?.toFixed(2)} &nbsp; <b>Final:</b> {result.finalLMI_scn?.toFixed(2)}</p>
</section>)}
</main>);
}
