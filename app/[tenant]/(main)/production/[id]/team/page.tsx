import React from "react";
import { auth } from "@/auth";
import {
  getCreativeTeam,
  getPeople,
  getShowById,
  getStaffPositions,
  getUserProfile,
} from "@/app/lib/baserow";
import { isAdminRole } from "@/app/lib/permissions";
import ProductionTeamManager, {
  type TeamMemberItem,
} from "@/app/components/production/ProductionTeamManager";

export const dynamic = "force-dynamic";

export default async function TeamListPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }> | { tenant: string; id: string };
}) {
  const { tenant, id } = await params;
  const productionId = parseInt(id, 10);
  const session = await auth();

  const [show, team, userProfile, people, staffPositions] = await Promise.all([
    getShowById(tenant, productionId),
    getCreativeTeam(tenant, productionId),
    session?.user?.email ? getUserProfile(tenant, session.user.email) : Promise.resolve(null),
    getPeople(tenant).catch(() => []),
    getStaffPositions(tenant).catch(() => []),
  ]);

  const canManage = Boolean(userProfile && isAdminRole(userProfile.role));

  const extractString = (val: any) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (Array.isArray(val)) return val.map((item: any) => item.value || item).join(", ");
    if (typeof val === "object") return val.value || "";
    return String(val);
  };

  const teamList: TeamMemberItem[] = (team || []).map((member: any) => {
    let headshotUrl = null;
    const rawHeadshot = member.headshot || member.Headshot;
    if (Array.isArray(rawHeadshot) && rawHeadshot.length > 0) {
      headshotUrl = rawHeadshot[0].url;
    } else if (typeof rawHeadshot === "string") {
      headshotUrl = rawHeadshot;
    }

    let extractedName = extractString(member.personName || member.Person || member.person || member.name);
    let extractedRole = extractString(member.position || member.Position || member.role || member.roleName);

    if (!extractedName || !extractedRole) {
      const rawAssignment = extractString(member.assignment || member.Assignment || member.field_5847);
      if (rawAssignment) {
        const parts = rawAssignment.split(" - ");
        if (!extractedName && parts.length > 0) extractedName = parts[0].trim();
        if (!extractedRole && parts.length > 1) extractedRole = parts[1].trim();
      }
    }

    return {
      id: Number(member.id),
      personId: member.personId ? Number(member.personId) : null,
      positionId: member.positionId ? Number(member.positionId) : null,
      name: extractedName || "Unknown Team Member",
      roleName: extractedRole || "Unknown Role",
      headshot: headshotUrl,
      email: extractString(member.email || member.Email),
      phone: extractString(member.phone || member.Phone),
    };
  });

  return (
    <ProductionTeamManager
      tenant={tenant}
      productionId={productionId}
      showTitle={show?.title || "Production"}
      canManage={canManage}
      initialTeam={teamList}
      people={(people || []).map((p: any) => ({
        id: Number(p.id),
        name: p.name || "Unnamed",
        email: p.email || "",
        phone: p.phone || "",
      }))}
      staffPositions={(staffPositions || []).map((pos: any) => ({
        id: Number(pos.id),
        name: pos.name || pos.roleName || "Staff",
        department: pos.department || "",
      }))}
    />
  );
}
