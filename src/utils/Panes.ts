import { CSSProperties } from 'react'
import { ComponentDescription } from '../components/player/VendorComponents'

export interface ConsoleOptions {
  showFileName: boolean
  showLineNumber: boolean
  renderReactElements: boolean
}

export interface EmbeddedPaneOptions {
  visible: boolean
  maximized: boolean
  collapsible: boolean
}

export type EmbeddedConsoleOptions = ConsoleOptions & EmbeddedPaneOptions

export type PaneBaseOptions = {
  id: string
  title?: string
  style?: CSSProperties
}

export type StackPaneOptions = PaneBaseOptions & {
  type: 'stack'
  children: Pane[]
}

export type EditorPaneOptions = PaneBaseOptions & {
  type: 'editor'
}

export type TranspilerPaneOptions = PaneBaseOptions & {
  type: 'transpiler'
}

export type PlayerPaneOptions = PaneBaseOptions & {
  type: 'player'
  platform?: string
  scale?: number
  width?: number
  assetRoot?: string
  vendorComponents: ComponentDescription[]
  styleSheet?: string
  css?: string
  prelude?: string
  statusBarHeight?: number
  statusBarColor?: string
  console?: EmbeddedConsoleOptions
}

export type WorkspacesPaneOptions = PaneBaseOptions & {
  type: 'workspaces'
}

export type ConsolePaneOptions = PaneBaseOptions &
  ConsoleOptions & {
    type: 'console'
  }

export type PaneOptions =
  | StackPaneOptions
  | EditorPaneOptions
  | TranspilerPaneOptions
  | PlayerPaneOptions
  | WorkspacesPaneOptions
  | ConsolePaneOptions

export type PaneShorthand = PaneOptions['type']

export type Pane = /* PaneShorthand | */ PaneOptions

export const containsPane = (panes: Pane[], target: string): boolean =>
  panes.some((pane: Pane) => {
    if (typeof pane === 'string') return pane === target

    if (pane.type === target) return true

    const children = (pane.type === 'stack' && pane.children) || []

    return containsPane(children, target)
  })

let initialId = 0
const getNextId = () => `${initialId++}`

/**
 * Turn panes into objects, and assign a unique id to each.
 */
export const normalizePane = (pane: string | PaneOptions): PaneOptions => {
  const id = getNextId()

  if (typeof pane === 'string') {
    return { id, type: pane } as PaneOptions
  }

  pane.id = getNextId()

  if (pane.type === 'stack') {
    return {
      ...pane,
      children: pane.children.map(normalizePane),
    }
  }

  return pane
}
