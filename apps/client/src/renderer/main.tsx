import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App, aplicarTemaCedo, arrancarLingua } from "@enclave/ui"
import "@enclave/ui/styles.css"
import { createDesktopBridge } from "./bridge.js"

const root = document.getElementById("root")
if (!root) throw new Error("missing #root")

// Before `render`: the first draw must go out already in the right language.
// English until the person chooses (1.3.9): the system language does not count.
document.documentElement.lang = arrancarLingua()
// And in the right colour theme: `applyPrefs` only runs after mount.
aplicarTemaCedo()

createRoot(root).render(
  <StrictMode>
    <App bridge={createDesktopBridge()} lotePorQuadro />
  </StrictMode>,
)
