import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <p className="eyebrow">404</p>
      <h1 className="display mt-3 text-5xl">This scene was cut.</h1>
      <p className="mt-4 text-muted">The page you were looking for doesn&apos;t exist.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn btn-primary">Back to the studio</Link>
        <Link href="/projects" className="btn btn-ghost">Browse projects</Link>
      </div>
    </PageShell>
  );
}
