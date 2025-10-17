export type Answer={score?:number;scenarioScore?:number;note?:string};
export type TimeCategory='Sleep'|'Work'|'Commute'|'Relationships'|'Leisure'|'Gym'|'Chores'|'Growth'|'Other';
export type TimeRow={category:TimeCategory;hours:number;ri:number};
export type DimensionKey='Fulfillment'|'Connection'|'Autonomy'|'Vitality'|'Peace';
export type Input={answers:Answer[];timeMap:TimeRow[];ELI:number;config?:Partial<Config>};
export type Output={calibrated:{current:number[];scenario:(number|undefined)[]};sectionAverages:{current:Record<DimensionKey,number|null>;scenario:Record<DimensionKey,number|null>;};rawLMS:number;riAdjusted:number;finalLMI:number;rawLMS_scn:number;riAdjusted_scn:number;finalLMI_scn:number;topDrainers:{index:number;score:number;note?:string}[];topUplifters:{index:number;score:number;note?:string}[];};
export type Config={calibration:{k:number;max:number};ri:{globalMultiplier:number};crossLift:{enabled:boolean;alpha:number};};
const DEFAULT_CONFIG:Config={calibration:{k:1.936428228,max:8.75},ri:{globalMultiplier:1},crossLift:{enabled:false,alpha:20}};
const DIM_MAP:Record<DimensionKey,number[]>={Fulfillment:[0,1,2,3,4],Connection:[5,6,7,8,9],Autonomy:[10,11,12,13,14],Vitality:[15,16,17,18,19],Peace:[20,21,22,23]};
function qualityFromSections(d:Record<DimensionKey,number|null>,base:number|null){return{Work:d.Autonomy??base??0,Commute:d.Peace??base??0,Gym:d.Vitality??base??0,Relationships:d.Connection??base??0,Leisure:d.Fulfillment??base??0,Other:base??0};}
function riToInternal(ri:number|undefined){if(ri==null)return 0;if(ri<5)return (ri-5)*0.075;if(ri===5)return 0;return (ri-5)*0.06;}
function calibrate(s?:number,k=1.936428228,max=8.75){if(s==null)return undefined;const clamped=Math.max(1,Math.min(10,s));const num=1-Math.exp(-k*(clamped/10));const den=1-Math.exp(-k);return max*(num/den);}
function avg(arr:(number|undefined)[]){const v=arr.filter((x):x is number=>typeof x==='number'&&!Number.isNaN(x));if(!v.length)return null;return v.reduce((a,b)=>a+b,0)/v.length;}
export function scoreLMI(input:Input):Output{
 const cfg:Config={calibration:input.config?.calibration??DEFAULT_CONFIG.calibration,ri:input.config?.ri??DEFAULT_CONFIG.ri,crossLift:input.config?.crossLift??DEFAULT_CONFIG.crossLift};
 const current=input.answers.map(a=>calibrate(a.score,cfg.calibration.k,cfg.calibration.max));
 const scenario=input.answers.map(a=>calibrate(a.scenarioScore,cfg.calibration.k,cfg.calibration.max));
 const sectionCurrent:Record<DimensionKey,number|null>={Fulfillment:avg(DIM_MAP.Fulfillment.map(i=>current[i])),Connection:avg(DIM_MAP.Connection.map(i=>current[i])),Autonomy:avg(DIM_MAP.Autonomy.map(i=>current[i])),Vitality:avg(DIM_MAP.Vitality.map(i=>current[i])),Peace:avg(DIM_MAP.Peace.map(i=>current[i]))};
 const sectionScenario:Record<DimensionKey,number|null>={Fulfillment:avg(DIM_MAP.Fulfillment.map(i=>scenario[i])),Connection:avg(DIM_MAP.Connection.map(i=>scenario[i])),Autonomy:avg(DIM_MAP.Autonomy.map(i=>scenario[i])),Vitality:avg(DIM_MAP.Vitality.map(i=>scenario[i])),Peace:avg(DIM_MAP.Peace.map(i=>scenario[i]))};
 const baseAvgAll=avg(current); const baseAvgAll_scn=avg(scenario);
 const find=(c:TimeCategory)=>input.timeMap.find(r=>r.category===c)??{category:c,hours:c==='Sleep'?49:0,ri:5};
 const byCat={Sleep:find('Sleep'),Work:find('Work'),Commute:find('Commute'),Relationships:find('Relationships'),Leisure:find('Leisure'),Gym:find('Gym'),Chores:find('Chores'),Growth:find('Growth'),Other:find('Other')};
 const awakeHours=Math.max(0,168-byCat.Sleep.hours);
 const dimQ=qualityFromSections(sectionCurrent,baseAvgAll??0);
 const dimQ_s=qualityFromSections(sectionScenario,baseAvgAll_scn??(baseAvgAll??0));
 let workQ=dimQ.Work; const commuteQ=dimQ.Commute; const gymQ=dimQ.Gym; const relQ=dimQ.Relationships; const leisureQ=dimQ.Leisure; const otherQ=dimQ.Other;
 if(cfg.crossLift.enabled){const relFrac=awakeHours?byCat.Relationships.hours/awakeHours:0; const gymFrac=awakeHours?byCat.Gym.hours/awakeHours:0; const leisFrac=awakeHours?byCat.Leisure.hours/awakeHours:0;
   const relRI=Math.max(0,riToInternal(byCat.Relationships.ri)); const gymRI=Math.max(0,riToInternal(byCat.Gym.ri)); const leisRI=Math.max(0,riToInternal(byCat.Leisure.ri));
   const uplift=cfg.crossLift.alpha*(relFrac*relRI+gymFrac*gymRI+leisFrac*leisRI)*((10-workQ)/10); workQ=Math.min(10,Math.max(1,workQ+uplift));}
 const otherAwakeHrs=Math.max(0,awakeHours-(byCat.Work.hours+byCat.Commute.hours+byCat.Gym.hours+byCat.Relationships.hours+byCat.Leisure.hours));
 const awakeWeighted=(byCat.Work.hours*workQ+byCat.Commute.hours*commuteQ+byCat.Gym.hours*gymQ+byCat.Relationships.hours*relQ+byCat.Leisure.hours*leisureQ+otherAwakeHrs*otherQ)/(awakeHours||1);
 const sleepQ=(10+awakeWeighted)/2;
 const rawLMS=(byCat.Work.hours*workQ+byCat.Commute.hours*commuteQ+byCat.Gym.hours*gymQ+byCat.Relationships.hours*relQ+byCat.Leisure.hours*leisureQ+otherAwakeHrs*otherQ+byCat.Sleep.hours*sleepQ)/168;
 const netRI=(byCat.Work.hours/168)*riToInternal(byCat.Work.ri)+(byCat.Commute.hours/168)*riToInternal(byCat.Commute.ri)+(byCat.Gym.hours/168)*riToInternal(byCat.Gym.ri)+(byCat.Relationships.hours/168)*riToInternal(byCat.Relationships.ri)+(byCat.Leisure.hours/168)*riToInternal(byCat.Leisure.ri)+(otherAwakeHrs/168)*riToInternal(byCat.Other.ri);
 const riAdjusted=rawLMS*(1+cfg.ri.globalMultiplier*netRI);
 const LMC=10-0.2*(input.ELI??1);
 const finalLMI=riAdjusted*(LMC/10);
 let workQ_s=dimQ_s.Work??workQ; if(cfg.crossLift.enabled){const relFrac=awakeHours?byCat.Relationships.hours/awakeHours:0; const gymFrac=awakeHours?byCat.Gym.hours/awakeHours:0; const leisFrac=awakeHours?byCat.Leisure.hours/awakeHours:0;
   const relRI=Math.max(0,riToInternal(byCat.Relationships.ri)); const gymRI=Math.max(0,riToInternal(byCat.Gym.ri)); const leisRI=Math.max(0,riToInternal(byCat.Leisure.ri));
   const uplift=cfg.crossLift.alpha*(relFrac*relRI+gymFrac*gymRI+leisFrac*leisRI)*((10-workQ_s)/10); workQ_s=Math.min(10,Math.max(1,workQ_s+uplift));}
 const commuteQ_s=dimQ_s.Commute??commuteQ; const gymQ_s=dimQ_s.Gym??gymQ; const relQ_s=dimQ_s.Relationships??relQ; const leisureQ_s=dimQ_s.Leisure??leisureQ; const otherQ_s=dimQ_s.Other??otherQ;
 const awakeWeighted_s=(byCat.Work.hours*workQ_s+byCat.Commute.hours*commuteQ_s+byCat.Gym.hours*gymQ_s+byCat.Relationships.hours*relQ_s+byCat.Leisure.hours*leisureQ_s+otherAwakeHrs*otherQ_s)/(awakeHours||1);
 const sleepQ_s=(10+awakeWeighted_s)/2;
 const rawLMS_s=(byCat.Work.hours*workQ_s+byCat.Commute.hours*commuteQ_s+byCat.Gym.hours*gymQ_s+byCat.Relationships.hours*relQ_s+byCat.Leisure.hours*leisureQ_s+otherAwakeHrs*otherQ_s+byCat.Sleep.hours*sleepQ_s)/168;
 const riAdjusted_s=rawLMS_s*(1+cfg.ri.globalMultiplier*netRI);
 const finalLMI_s=riAdjusted_s*(LMC/10);
 const baseScores=input.answers.map(a=>a.score??NaN); const idxs=baseScores.map((s,i)=>({i,s})).filter(x=>!Number.isNaN(x.s));
 const drains=[...idxs].sort((a,b)=>a.s-b.s).slice(0,3).map(x=>({index:x.i,score:x.s,note:input.answers[x.i].note}));
 const lifts=[...idxs].sort((a,b)=>b.s-a.s).slice(0,3).map(x=>({index:x.i,score:x.s,note:input.answers[x.i].note}));
 return {calibrated:{current: current as number[], scenario: scenario},sectionAverages:{current:sectionCurrent,scenario:sectionScenario},
   rawLMS,riAdjusted,finalLMI,rawLMS_scn:rawLMS_s,riAdjusted_scn:riAdjusted_s,finalLMI_scn:finalLMI_s,topDrainers:drains,topUplifters:lifts};
}