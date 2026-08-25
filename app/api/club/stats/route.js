import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../lib/auth';
import { loyalty, sb, tables } from '../../../../lib/supabase';

const allowed=[ROLES.FIDELITY,ROLES.EMPLOYEE,ROLES.MANAGER,ROLES.ADMIN];
const dayKey=value=>new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const eventTime=event=>new Date(event.created_at||(event.event_day?`${event.event_day}T12:00:00Z`:0)).getTime();

export async function GET(request){
 if(!hasAnyRole(request,allowed))return NextResponse.json({error:'Accès Fidélité requis'},{status:403});
 try{
  const[members,history]=await Promise.all([sb(`${tables.members}?select=*&order=created_at.desc&limit=10000`),sb(`${tables.history}?select=member_id,event_type,event_day,created_at&order=created_at.desc&limit=10000`)]);
  const now=new Date(),nowTime=now.getTime(),today=dayKey(now),sevenDaysAgo=nowTime-7*86400000,thirtyDaysAgo=nowTime-30*86400000,passages=history.filter(event=>event.event_type==='passage'),rewards=history.filter(event=>event.event_type==='reward'),passagesByMember=new Map();
  passages.forEach(event=>{const rows=passagesByMember.get(event.member_id)||[];rows.push(event);passagesByMember.set(event.member_id,rows)});
  const memberRows=members.map(member=>{const visits=passagesByMember.get(member.id)||[],lastPassage=visits.reduce((latest,event)=>eventTime(event)>eventTime(latest)?event:latest,visits[0]||null),referenceTime=lastPassage?eventTime(lastPassage):new Date(member.created_at).getTime(),inactiveDays=Number.isFinite(referenceTime)?Math.max(0,Math.floor((nowTime-referenceTime)/86400000)):0;return{id:member.id,name:[member.first_name,member.last_name].filter(Boolean).join(' ')||member.email||member.personal_code,email:member.email||'',lastPassageAt:lastPassage?.created_at||lastPassage?.event_day||null,totalPassages:visits.length,inactiveDays,createdAt:member.created_at,stamps:Number(member.loyalty_points)||0,rewardReached:Boolean(member.reward_available)||(Number(member.loyalty_points)||0)>=loyalty.stampsRequired,passages30Days:visits.filter(event=>eventTime(event)>=thirtyDaysAgo).length}});
  const relaunch=memberRows.filter(member=>member.inactiveDays>=30).sort((a,b)=>b.inactiveDays-a.inactiveDays),topLoyal=memberRows.filter(member=>member.passages30Days>0).sort((a,b)=>b.passages30Days-a.passages30Days||a.name.localeCompare(b.name,'fr')).slice(0,5);
  return NextResponse.json({totalMembers:members.length,newMembersToday:members.filter(member=>dayKey(member.created_at)===today).length,newMembers7Days:members.filter(member=>new Date(member.created_at).getTime()>=sevenDaysAgo).length,newMembers30Days:members.filter(member=>new Date(member.created_at).getTime()>=thirtyDaysAgo).length,passagesToday:passages.filter(event=>event.event_day?event.event_day===today:dayKey(event.created_at)===today).length,passages7Days:passages.filter(event=>eventTime(event)>=sevenDaysAgo).length,passages30Days:passages.filter(event=>eventTime(event)>=thirtyDaysAgo).length,totalRewards:rewards.length,membersRewardReached:memberRows.filter(member=>member.rewardReached).length,averagePassagesPerMember:members.length?Math.round(passages.length/members.length*10)/10:0,clientsInactive30:relaunch.length,relaunch,topLoyal});
 }catch(error){return NextResponse.json({error:error.message},{status:500})}
}
