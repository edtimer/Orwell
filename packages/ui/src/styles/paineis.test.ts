import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/**
 * The surfaces (`paineis.css`) in the flat skin (1.4).
 *
 * Until 1.4 every surface was a nearly solid tint over a drifting aurora,
 * with an accent outline, an inner highlight and a deep shadow. The flat skin
 * replaced that with Discord's model: columns that meet edge to edge and are
 * told apart by tone; cards one step off the page with a hairline; floats in
 * the popover colour with a hairline and a shadow. This pins that model down.
 *
 * Text contrast on every surface, in both themes, is in
 * `tokens.contraste.test.ts`.
 */
const ler = (relativo: string): string => readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), "utf8")
const semComentarios = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "")
/** All the sheets that `styles.css` imports, in its order. */
const nomes = [...ler("../styles.css").matchAll(/@import "\.\/styles\/([a-z]+\.css)"/g)].map((m) => m[1] as string)
const folhas: Record<string, string> = Object.fromEntries(nomes.map((nome) => [nome, semComentarios(ler(`./${nome}`))]))
const paineis = folhas["paineis.css"] as string
const tokens = folhas["tokens.css"] as string

/** The selector list of the `:is(...)` rule that declares exactly this body. */
function listaDe(corpo: RegExp): string[] {
  const m = new RegExp(`:is\\(([^{]*)\\)\\s*\\{\\s*${corpo.source}`).exec(paineis)
  return (m?.[1] ?? "").split(/[\s,]+/).filter(Boolean)
}

describe("as superfícies, na pele plana", () => {
  it("nenhuma folha tem `backdrop-filter`", () => {
    for (const [nome, css] of Object.entries(folhas)) expect(css, nome).not.toMatch(/backdrop-filter/)
  })

  it("nem o filtro `#liquido`: nem nas folhas, nem na chamada", () => {
    for (const [nome, css] of Object.entries(folhas)) expect(css, nome).not.toMatch(/url\(#/)
    expect(ler("../screens/call/CallPanel.tsx")).not.toMatch(/<filter|liquido/)
  })

  it("e `paineis.css` não tem camadas: a tinta pinta-se na própria superfície", () => {
    expect(paineis).not.toMatch(/::before/)
    expect(paineis).toMatch(/:is\([^)]*\.rail,[\s\S]*?\)\s*\{\s*background:\s*var\(--painel-fundo\)/)
  })

  it("não há aurora em folha nenhuma", () => {
    for (const [nome, css] of Object.entries(folhas)) expect(css, nome).not.toMatch(/aurora/i)
  })

  it.each(["--painel-tinta", "--painel-claro", "--painel-poco", "--painel-barra", "--painel-interior", "--painel-flutuante"])(
    "%s é sólida: aponta para uma superfície do tema, nunca um rgba",
    (nome) => {
      expect(tokens).toMatch(new RegExp(`${nome}:\\s*var\\(--[a-z-]+\\);`))
    },
  )

  it("as colunas distinguem-se pelo tom: sem contorno, sem raio em ecrã largo", () => {
    expect(listaDe(/border:\s*none/)).toEqual(expect.arrayContaining([".rail", ".sidebar", ".members"]))
    expect(paineis).toMatch(/@media \(min-width: 841px\)\s*\{\s*\.rail,[^{]*\{\s*border-radius:\s*0/)
  })

  it("cartões e flutuantes têm o filete; as colunas não", () => {
    const comFilete = listaDe(/border:\s*1px solid var\(--painel-borda\)/)
    for (const dentro of [".card", ".sheet", ".context-menu", ".emoji-panel", ".notif-panel", ".mention-picker"]) {
      expect(comFilete).toContain(dentro)
    }
    for (const fora of [".rail", ".sidebar", ".members", ".topbar", ".toast"]) expect(comFilete).not.toContain(fora)
    expect(tokens).toMatch(/--painel-borda:\s*var\(--line\)/)
  })

  it("os flutuantes têm sombra, as folhas a mais funda", () => {
    expect(paineis).toMatch(/--painel-fundo:\s*var\(--painel-flutuante\);\s*box-shadow:\s*var\(--sombra-2\)/)
    expect(paineis).toMatch(/:where\(\.sheet, \.prompt\)\s*\{\s*box-shadow:\s*var\(--sombra-3\)/)
  })

  it("o cartão do mural debaixo do rato fica um tom acima", () => {
    const rato = /\.card\.post:hover,\s*\.post-row:hover\s*\{([^}]*)\}/.exec(paineis)?.[1] ?? ""
    expect(rato).toMatch(/--painel-fundo:\s*var\(--painel-claro\)/)
    expect(rato).toMatch(/background:\s*var\(--painel-fundo\)/)
  })

  it("as gavetas do telemóvel são sólidas", () => {
    expect(tokens).toMatch(/--painel-gaveta:\s*var\(--vidro-solido\)/)
    expect(paineis).toMatch(/max-width: 840px\)\s*\{[^}]*--painel-fundo:\s*var\(--painel-gaveta\)/)
  })

  // The outline that spun around the account card disappeared with it.
  it("a faixa da conta já não tem o contorno que gira", () => {
    for (const [nome, css] of Object.entries(folhas)) {
      expect(css, nome).not.toMatch(/conic-gradient\(from var\(--ang\)/)
    }
  })
})
