import { existsSync, readFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/**
 * The emoji are drawn by our own font, the same on every system, and the picker
 * card is opaque.
 *
 * Windows draws no flags (two letters, "PT") and Windows 10 has no emoji newer
 * than 12 (empty squares). The proof that the browsers really use this font,
 * with the system's emoji out of the way, is `scripts/capturar-selector-emoji.mjs`.
 */
const ler = (relativo: string): string => readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), "utf8")
const semComentarios = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "")
const fontes = semComentarios(ler("./fontes.css"))
const tokens = semComentarios(ler("./tokens.css"))
const ecras = semComentarios(ler("./screens.css"))

const face = /@font-face\s*\{[^}]*font-family:\s*"Orwell Emoji"[^}]*\}/.exec(fontes)?.[0] ?? ""
const intervalo = /unicode-range:([^;]*);/.exec(face)?.[1] ?? ""
/** Does the face's `unicode-range` cover this code point? */
const cobre = (ponto: number): boolean =>
  intervalo.split(",").some((parte) => {
    const [a, b] = parte.trim().replace("U+", "").split("-")
    const inicio = parseInt(a ?? "", 16)
    const fim = b ? parseInt(b, 16) : inicio
    return ponto >= inicio && ponto <= fim
  })

describe("os emojis com fonte nossa", () => {
  it("a fonte é servida pela própria app, em diferido, e é pequena", () => {
    expect(face).toMatch(/font-display:\s*swap/)
    const url = /url\("([^"]+)"\)/.exec(face)?.[1] ?? ""
    expect(url).toMatch(/^\.\.\/fontes\/.+\.woff2$/)
    const ficheiro = fileURLToPath(new URL(url, import.meta.url))
    expect(existsSync(ficheiro)).toBe(true)
    expect(statSync(ficheiro).size).toBeLessThan(2_100_000)
  })

  it("só a toma quem desenha COLRv1: o WebKit fica com os emojis do sistema", () => {
    expect(face).toMatch(/format\("woff2"\)\s+tech\(color-COLRv1\)/)
  })

  it("cobre as bandeiras, os tons de pele, o ZWJ, os emojis novos e as teclas (1️⃣), e não as letras", () => {
    for (const ponto of [0x1f1f5, 0x1f1f9, 0x1f600, 0x1f3fd, 0x200d, 0x20e3, 0x1fae0, 0xe0067, 0x2764, 0x23, 0x31]) {
      expect(cobre(ponto), ponto.toString(16)).toBe(true)
    }
    for (const ponto of [0x41, 0x61, 0x20, 0xe9]) expect(cobre(ponto), ponto.toString(16)).toBe(false)
  })

  it("entra antes das fontes do sistema, no selector, nas fichas, nas mensagens e na caixa", () => {
    const pilha = /--fonte-com-emoji:\s*([^;]+);/.exec(tokens)?.[1] ?? ""
    expect(pilha.indexOf('"Orwell Emoji"')).toBeGreaterThan(-1)
    expect(pilha.indexOf('"Orwell Emoji"')).toBeLessThan(pilha.indexOf("system-ui"))
    // The text font first: plain digits and letters never reach the emoji font.
    expect(pilha.indexOf('"Inter Variable"')).toBe(0)
    expect(ecras).toMatch(/\.emoji-panel,\s*\.reaccao,\s*\.message-body,\s*\.chat-composer\s*\{\s*font-family:\s*var\(--fonte-com-emoji\);/)
  })

  it("não apanha setas nem símbolos de texto que a fonte do texto não tem: continuam monocromáticos", () => {
    for (const ponto of [0x203c, 0x2139, 0x2194, 0x2199, 0x21a9, 0x25b6, 0x2660, 0x2663, 0x2665, 0x2666, 0x2714, 0x2716, 0x27a1, 0x2b05, 0x2b07]) {
      expect(cobre(ponto), ponto.toString(16)).toBe(false)
    }
  })

  it("o cartão do selector é opaco: o texto da conversa não passa entre os emojis", () => {
    const fundo = /\.emoji-panel\s*\{\s*--painel-fundo:\s*([^;]+);/.exec(ecras)?.[1] ?? ""
    expect(fundo).toMatch(/^rgb\(\s*\d+,\s*\d+,\s*\d+\s*\)$/)
  })
})
