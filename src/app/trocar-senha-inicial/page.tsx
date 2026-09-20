import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { InitialPasswordForm } from "@/components/team/InitialPasswordForm";
import { SecurityPageShell } from "@/components/auth/SecurityPageShell";
export default async function InitialPasswordPage(){const session=await auth.api.getSession({headers:await headers()});if(!session?.user)redirect("/login");const profile=await prisma.teamMemberProfile.findUnique({where:{userId:session.user.id}});if(!profile?.mustChangePassword)redirect("/app/dashboard");return <SecurityPageShell><InitialPasswordForm /></SecurityPageShell>}
