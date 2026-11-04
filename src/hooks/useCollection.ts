import {useCallback,useEffect,useState} from 'react';
import {message} from '../services/api';
export function useCollection<T>(loader:()=>Promise<T[]>,deps:unknown[]){const [items,setItems]=useState<T[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const reload=useCallback(async()=>{setLoading(true);setError('');try{setItems(await loader())}catch(e){setError(message(e))}finally{setLoading(false)}},deps);// eslint-disable-line react-hooks/exhaustive-deps
useEffect(()=>{void reload()},[reload]);return {items,loading,error,reload,setItems}}
