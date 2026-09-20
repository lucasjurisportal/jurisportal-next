import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";

export async function GET() {
  const context=await getAppContext(); if(!context.ok)return NextResponse.json({error:context.reason},{status:401});
  if(!hasCapability(context.workspace.plan,"team.activity"))return NextResponse.json({error:"TEAM_ACTIVITY_NOT_AVAILABLE_FOR_PLAN"},{status:403});
  if(context.workspace.role!=="owner")return NextResponse.json({error:"TEAM_OWNER_REQUIRED"},{status:403});
  const events=await prisma.auditEvent.findMany({where:{organizationId:context.workspace.organizationId,actorUserId:{not:null}},orderBy:{createdAt:"desc"},take:100,select:{id:true,actorUserId:true,category:true,action:true,entityType:true,entityId:true,createdAt:true,actor:{select:{name:true,email:true}}}});
  return NextResponse.json({ok:true,events});
}
