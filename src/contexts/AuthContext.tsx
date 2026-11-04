import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import type {Session,User} from '@supabase/supabase-js';
import {configured,supabase} from '../services/supabase';
import {api} from '../services/api';
import type {Household} from '../types/models';
type AuthCtx={user:User|null;session:Session|null;loading:boolean;households:Household[];household:Household|null;setHousehold:(id:string)=>void;refresh:()=>Promise<void>};
const Context=createContext<AuthCtx|null>(null);
export function AuthProvider({children}:{children:ReactNode}){const [session,setSession]=useState<Session|null>(null);const [loading,setLoading]=useState(true);const [households,setHouseholds]=useState<Household[]>([]);const [activeId,setActiveId]=useState('');
 const refresh=useCallback(async()=>{if(!configured||!session){setHouseholds([]);return}try{const data=await api.households();setHouseholds(data);setActiveId(old=>data.some(h=>h.id===old)?old:data[0]?.id||'')}catch{setHouseholds([])}},[session]);
 useEffect(()=>{if(!configured){setLoading(false);return}supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data}=supabase.auth.onAuthStateChange((_event,s)=>{setSession(s);setLoading(false)});return()=>data.subscription.unsubscribe()},[]);
 useEffect(()=>{void refresh()},[refresh]);return <Context.Provider value={{user:session?.user||null,session,loading,households,household:households.find(h=>h.id===activeId)||null,setHousehold:setActiveId,refresh}}>{children}</Context.Provider>}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider ausente');return value}
