import { resolveRobotsTxtForProject } from "@/lib/cms-robots-site";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_PUBLIC = ["User-agent: *", "Allow: /"].join("\n") + "\n";

export async function GET(req: Request) {
  const project = await resolveProjectFromRequest(req);
  const body = project ? await resolveRobotsTxtForProject(project.id) : GENERIC_PUBLIC;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=86400",
    },
  });
}
