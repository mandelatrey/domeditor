// domeditor's file access for Next.js. In app/api/dev/domeditor/route.dev.ts:
//   export { GET, POST } from "domeditor/next/route";
// The `.dev.ts` name keeps the route out of production builds (see withDomEditor in domeditor/next/config);
// the handler also refuses to run outside development.
import { createHandler } from "../core/server";

const handle = createHandler();

export const GET = (req: Request) => handle(req);
export const POST = (req: Request) => handle(req);
