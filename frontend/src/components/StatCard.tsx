import type { LucideIcon } from 'lucide-react';
export default function StatCard({icon:Icon,label,value,color='purple'}:{icon:LucideIcon;label:string;value:number;color?:string}){return <div className="stat-card"><div className={`stat-icon ${color}`}><Icon/></div><div><small>{label}</small><strong>{value}</strong></div></div>}
