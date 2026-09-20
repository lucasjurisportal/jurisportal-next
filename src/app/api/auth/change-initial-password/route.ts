import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";

const schema=z.object({currentPassword:z.string().min(8).max(128),newPassword:z.string().min(8).max(128)}).refine(v=>v.currentPassword!==v.newPassword,{message:"NEW_PASSWORD_MUST_DIFFER",path:["newPassword"]});
export async function POST(request: Request){
  const session=await auth.api.getSession({headers:request.headers}); if(!session?.user)return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
  const profile=await prisma.teamMemberProfile.findUnique({where:{userId:session.user.id}}); if(!profile||profile.status!=="ACTIVE"||!profile.mustChangePassword)return NextResponse.json({error:"INITIAL_PASSWORD_CHANGE_NOT_REQUIRED"},{status:409});
  const parsed=schema.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({error:"INVALID_PASSWORD_CHANGE"},{status:422});
  try{
    await auth.api.changePassword({headers:request.headers,body:{currentPassword:parsed.data.currentPassword,newPassword:parsed.data.newPassword,revokeOtherSessions:true}});
    await prisma.$transaction([prisma.teamMemberProfile.update({where:{userId:session.user.id},data:{mustChangePassword:false}}),prisma.auditEvent.create({data:{organizationId:profile.organizationId,actorUserId:session.user.id,category:"team",action:"team.member.initial_password_changed",entityType:"user",entityId:session.user.id}})]);
    return NextResponse.json({ok:true});
  }catch(error){console.error("[team.initial-password]",error);return NextResponse.json({error:"CURRENT_PASSWORD_INVALID"},{status:400});}
}
