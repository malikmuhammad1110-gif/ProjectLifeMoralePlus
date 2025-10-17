import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scoreLMI } from '../../../lib/scoring';
const AnswerSchema=z.object({score:z.number().min(1).max(10).optional(),scenarioScore:z.number().min(1).max(10).optional(),note:z.string().optional()});
const TimeRowSchema=z.object({category:z.enum(['Sleep','Work','Commute','Relationships','Leisure','Gym','Chores','Growth','Other']),hours:z.number().min(0).max(168),ri:z.number().min(1).max(10)});
const InputSchema=z.object({answers:z.array(AnswerSchema).length(24),timeMap:z.array(TimeRowSchema).length(9),ELI:z.number().min(1).max(10).default(1),
  config:z.object({calibration:z.object({k:z.number(),max:z.number()}).optional(),ri:z.object({globalMultiplier:z.number()}).optional(),crossLift:z.object({enabled:z.boolean(),alpha:z.number()}).optional()}).optional()});
export async function POST(req:NextRequest){
  try{const body=await req.json();const parsed=InputSchema.parse(body);const result=scoreLMI(parsed);return NextResponse.json(result);}
  catch(e:any){return NextResponse.json({error:e?.message??'Invalid request'},{status:400});}
}
