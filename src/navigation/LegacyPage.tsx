/** Light card that keeps a page not yet migrated to the board readable on the dark floor. Removed with the cleanup (#98). */

import type { ReactNode } from "react"

function LegacyPage({ children }: { readonly children: ReactNode }) {
  return <div className="legacy-page">{children}</div>
}

export default LegacyPage
