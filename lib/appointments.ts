import {z} from 'zod';
export const appointmentKinds=['Inseminação','Ultrassom','Vacina','Exame','Medicamento'] as const;
export const agendaToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const appointmentSchema=z.object({
 animalId:z.string().uuid(),animalType:z.enum(['cow','calf']),kind:z.enum([...appointmentKinds,'Parto']),
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const parsed=new Date(value+'T12:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value&&value>=agendaToday();},{message:'Informe uma data de hoje em diante.'}),
 notes:z.string().max(5000).default('')
});
export type AppointmentInput=z.infer<typeof appointmentSchema>;
export type AgendaAnimal={id:string;type:'cow'|'calf';name:string;tag:string};
export type Appointment=AppointmentInput&{id:string;animalName:string;tag:string;sourceKey:string|null};
export type LegacyAppointment={tag?:string;animalType?:'cow'|'calf';id:string;date:string;animalName:string;kind:string;notes:string};
