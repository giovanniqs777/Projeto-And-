import {z} from 'zod';
const optionalDate=z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default('');
const photo=z.string().regex(/^(\/api\/photos\/[a-f0-9-]+)?$/).default('');
export const calfFrame=z.object({zoom:z.number().min(1).max(4),x:z.number().min(0).max(100),y:z.number().min(0).max(100),fit:z.enum(['contain','cover'])}).default({zoom:1,x:50,y:50,fit:'contain'});
export const calfSchema=z.object({
 id:z.string().uuid().optional(),name:z.string().trim().min(1).max(100),tag:z.string().trim().min(1).max(50),
 photo,bodyPhoto:photo,photoFrame:calfFrame,bodyFrame:calfFrame,
 motherTag:z.string().trim().max(50).default(''),motherName:z.string().trim().max(100).default(''),
 birth:optionalDate,breed:z.string().trim().min(1).max(80),
 dailyMilk:z.string().default('').refine(v=>v===''||(Number.isFinite(Number(v))&&Number(v)>=0)),
 weaningDate:optionalDate,medicineDate:optionalDate,medicine:z.string().max(5000).default(''),vaccinationDate:optionalDate
});
export type Calf=z.infer<typeof calfSchema>;
export function readCalfFrame(value:unknown){try{return calfFrame.parse(value?JSON.parse(String(value)):undefined);}catch{return calfFrame.parse(undefined);}}
