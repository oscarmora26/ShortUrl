import Link from "next/link";

import { buttonClassName } from "@/components/button";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageContent } from "@/components/page-header";

/** Unknown codes land here instead of an unstyled Next default. */
export default function AdminNotFound() {
  return (
    <PageContent>
      <Card>
        <EmptyState
          title="Ese link no existe"
          description="El código no está en la base. Puede haberse escrito mal o haberse borrado."
          action={
            <Link href="/admin/links" className={buttonClassName("secondary")}>
              Volver al índice
            </Link>
          }
        />
      </Card>
    </PageContent>
  );
}
