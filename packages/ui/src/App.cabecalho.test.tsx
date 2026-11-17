import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ConnectionState, EnclaveBridge } from "./bridge.js"
import { App } from "./App.js"
import { APRESENTADOS_KEY } from "./hooks/usePrefs.js"
import { strings } from "./strings.js"
import { moradaDeTeste } from "../testes/moradas.js"

/**
 * The conversation header says where you are (1.4).
 *
 * In a community, the heading is the OPEN ROOM (its glyph and name), the way a
 * Discord user looks for it, and the community and its topic follow on the same
 * line. Before, the header named only the community: someone in "geral" could
 * not tell from the top of the screen which room they were writing in.
 *
 * And the quiet status line under the conversation speaks only when the
 * connection is not fine: "connected" under every conversation was noise.
 */

afterEach(cleanup)

const EU = "@eu:casa.pt"
const LAGAR = "!lagar:casa.pt"
const MURAL_EU = moradaDeTeste("mural eu", "casa.pt")

let onConnection: ((payload: unknown) => void) | null = null

function ponte(topico: string | undefined): EnclaveBridge {
  onConnection = null
  return {
    vault: {
      status: async () => ({ exists: true, supportsOsProtection: true }),
      unlock: async () => ({ ok: true }),
      create: async () => ({ ok: true }),
      lock: async () => ({ ok: true }),
      destroy: async () => ({ ok: true }),
    },
    identity: {
      load: async () => ({ address: EU, accountId: "eu" }),
      create: async () => ({ address: EU, accountId: "eu" }),
    },
    session: {
      connect: async () => ({ ok: true }),
      capabilities: async () => ["mls"],
      setVisible: async () => ({ ok: true }),
    },
    channels: {
      list: async () => [LAGAR],
      create: async () => ({ ok: true }),
      invite: async () => ({ ok: true }),
      channelInvites: async () => [],
      acceptChannelInvite: vi.fn(async () => ({ ok: true })),
      declineChannelInvite: vi.fn(async () => ({ ok: true })),
      send: async () => ({ ok: true }),
      typing: async () => ({ ok: true }),
      buzz: async () => ({ ok: true }),
      members: async () => [EU],
      history: async () => [],
      forget: async () => ({ ok: true }),
      safetyNumber: async () => null,
      meta: () => ({ name: "O Lagar", ...(topico ? { topic: topico } : {}), updatedAt: 1 }),
      rooms: () => [{ room: "", name: "geral", category: "", kind: "text" as const, position: 0 }],
    },
    invites: {
      create: async () => "enclave://join/x/y#z",
      redeem: async () => ({ ok: true }),
      list: async () => [],
      revoke: async () => ({ ok: true }),
    },
    social: {
      post: async () => ({ ok: true }),
      acceptFollower: vi.fn().mockResolvedValue({ ok: true }),
      acceptFriend: vi.fn().mockResolvedValue({ ok: true }),
      declineFriend: vi.fn().mockResolvedValue({ ok: true }),
      unfriend: vi.fn().mockResolvedValue({ ok: true }),
      repairInvite: async () => ({ invited: true }),
      deadWelcomes: async () => [],
      feedChannel: async () => MURAL_EU,
    },
    profile: {
      get: async () => ({ displayName: "Vera", donations: [] }),
      set: async () => ({ ok: true }),
      directory: async () => ({}),
    },
    notifications: { list: async () => [], save: async () => ({ ok: true }) },
    on: {
      message: () => () => {},
      epoch: () => () => {},
      status: () => () => {},
      connection: (handler: (payload: unknown) => void) => {
        onConnection = handler
        return () => {
          onConnection = null
        }
      },
      channels: () => () => {},
      presence: () => () => {},
      typing: () => () => {},
      buzz: () => () => {},
      callActivity: () => () => {},
    },
    call: { on: () => () => {}, setMuted: () => {} },
  } as unknown as EnclaveBridge
}

async function ligar(state: ConnectionState): Promise<void> {
  await act(async () => {
    onConnection?.({ state })
    await Promise.resolve()
  })
}

async function abrirOLagar(topico?: string): Promise<HTMLElement> {
  const user = userEvent.setup()
  render(<App bridge={ponte(topico)} />)
  await screen.findByRole("button", { name: strings.rail.chat })
  await ligar("online")
  await act(async () => {
    await Promise.resolve()
  })
  const linha = [...document.querySelectorAll(".channel-row")].find((row) => /Lagar/.test(row.textContent ?? ""))
  await user.click(linha?.querySelector("button") as HTMLElement)
  return document.querySelector(".topbar") as HTMLElement
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(APRESENTADOS_KEY, JSON.stringify([LAGAR]))
})

describe("o cabeçalho diz onde estás", () => {
  it("o título é a sala aberta, e a comunidade e o tópico vêm a seguir, na mesma linha", async () => {
    const topo = await abrirOLagar("Vindimas e azeite")
    expect(within(topo).getByRole("heading", { level: 1 }).textContent).toBe("geral")
    expect(topo.querySelector(".topbar-glifo")).not.toBeNull()
    expect(topo.querySelector(".topbar-comunidade")?.textContent).toBe("O Lagar")
    expect(topo.querySelector(".topbar-topico")?.textContent).toBe("Vindimas e azeite")
  })

  it("sem tópico, só a comunidade", async () => {
    const topo = await abrirOLagar()
    expect(topo.querySelector(".topbar-comunidade")?.textContent).toBe("O Lagar")
    expect(topo.querySelector(".topbar-topico")).toBeNull()
  })
})

describe("a linha do estado só fala quando há o que dizer", () => {
  it("ligado, não diz nada; a religar, diz", async () => {
    await abrirOLagar()
    expect(document.querySelector(".statusbar")).toBeNull()
    await ligar("reconnecting")
    expect(document.querySelector(".statusbar")).not.toBeNull()
  })
})
