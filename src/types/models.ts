export type Base = { id:string; created_at:string };
export type Member = Base & {household_id:string; user_id:string; display_name:string; role:'admin'|'caregiver'; scope:'household'|'profile'; care_profile_id:string|null; color:string};
export type Household = Base & {name:string; created_by:string};
export type CareProfile = Base & {household_id:string; name:string; kind:'child'|'adult'|'pet'; birth_date:string|null; notes:string|null; created_by:string};
export type Task = Base & {household_id:string; title:string; details:string|null; due_at:string|null; status:'open'|'in_progress'|'done'; assigned_to:string|null; assignees?:string[]; category?:string|null; care_profile_id:string|null; planned_by:string; thought_by?:string|null; completed_by:string|null; completed_at:string|null};
export type Event = Base & {household_id:string; title:string; starts_at:string; ends_at:string|null; place:string|null; assigned_to:string|null; care_profile_id:string|null; created_by:string};
export type Checkin = Base & {user_id:string; household_id:string; mood:'leve'|'ok'|'cansada'|'no_limite'; water:number; movement:number; sleep_minutes:number|null; day:string};
export type Meal = Base & {household_id:string; day:string; title:string; cook_id:string|null; created_by:string};
export type Shopping = Base & {household_id:string; title:string; checked:boolean; created_by:string};
export type Dream = Base & {household_id:string; title:string; category:string; target_amount:number; saved_amount:number; created_by:string; care_profile_id:string|null};
export type Transaction = Base & {household_id:string; title:string; amount:number; kind:'income'|'expense'; category:string; due_date:string|null; paid:boolean; assigned_to:string|null; created_by:string; visibility:'private'|'shared'; care_profile_id:string|null};
export type Invitation = Base & {household_id:string; email:string; role:string; scope:string; care_profile_id:string|null; token:string; expires_at:string; accepted_at:string|null};
export type ChatMessage = Base & {household_id:string; user_id:string; content:string; sender:'user'|'assistant'; metadata:Record<string,unknown>|null};

export type TaskAcceptance = {task_id:string;user_id:string;household_id:string;accepted_at:string};
