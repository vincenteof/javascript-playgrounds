import React, { PureComponent, CSSProperties, RefObject } from 'react'
import { getErrorDetails } from '../../utils/ErrorMessage'
import { prefixObject, mergeStyles, prefix } from '../../utils/Styles'
import About from './About'
import Button from './Button'
import Console from './Console'
import Editor from './Editor'
import Fullscreen from './Fullscreen'
import Header from './Header'
import Overlay from './Overlay'
import PlayerFrame from './PlayerFrame'
import Status from './Status'
import TabContainer from './TabContainer'
import Tabs from './Tabs'
import WorkspacesList from './WorkspacesList'
import { workerRequest } from '../../utils/WorkerRequest'
import type { WorkspaceDiff } from '../../index'
import type * as ts from 'typescript'
import { ConsoleCommand, LogCommand } from '../../types/Messages'
import { ComponentDescription } from '../player/VendorComponents'

export type BabelWorkerMessage = {
  filename: string
} & (
  | {
      type: 'code'
      code: string
    }
  | {
      type: 'error'
      error: {
        message: string
      }
    }
)

export type TypeScriptRequest =
  | {
      type: 'libs'
      libs: string[]
      types: string[]
    }
  | {
      type: 'file'
      filename: string
      code: string
    }
  | {
      type: 'quickInfo'
      filename: string
      position: number
    }

const BabelWorker = require('../../babel-worker.js')
const babelWorker = new BabelWorker()

// Utilities for determining which babel worker responses are for the player vs
// the transpiler view, since we encode this information in the filename.
const transpilerPrefix = '@babel-'
const getTranspilerId = (filename: string): string =>
  `${transpilerPrefix}${filename}`
const isTranspilerId = (filename: string): boolean =>
  filename.indexOf(transpilerPrefix) === 0

interface Tab {
  index: number
  title: string
  changed: boolean
}
const compareTabs = (a: Tab, b: Tab) => a.index === b.index
const getTabTitle = (tab: Tab) => tab.title
const getTabChanged = (tab: Tab) => tab.changed

const containsPane = (panes: Pane[], target: string): boolean =>
  panes.some((pane: Pane) => {
    if (typeof pane === 'string') return pane === target

    if (pane.type === target) return true

    const children = (pane.type === 'stack' && pane.children) || []

    return containsPane(children, target)
  })

const normalizePane = (pane: Pane): PaneObject => {
  if (typeof pane === 'string') {
    return { type: pane } as PaneObject
  }

  return pane
}

const findPaneSetIndex = (
  responsivePaneSets: ResponsivePaneSet[],
  windowWidth?: number
): number =>
  windowWidth === undefined
    ? responsivePaneSets.length - 1
    : responsivePaneSets.findIndex((paneSet) => paneSet.maxWidth > windowWidth)

const columnStyle: CSSProperties = prefix({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden', // Clip box shadows
  position: 'relative',
})

const rowStyle: CSSProperties = prefix({
  flex: '1',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'stretch',
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden', // Clip box shadows
  position: 'relative',
})

const styles = prefixObject({
  container: rowStyle,
  editorPane: columnStyle,
  transpilerPane: columnStyle,
  consolePane: columnStyle,
  playerPane: mergeStyles(columnStyle, { flex: '0 0 auto' }),
  workspacesPane: mergeStyles(columnStyle, {
    width: 220,
    overflowX: 'hidden',
    overflowY: 'auto',
  }),
  overlayContainer: {
    position: 'relative',
    flex: 0,
    height: 0,
    alignItems: 'stretch',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    background: 'rgba(255,255,255,0.95)',
    zIndex: 100,
    left: 4,
    right: 0,
    borderTop: '1px solid #F8F8F8',
    display: 'flex',
    alignItems: 'stretch',
    overflow: 'auto',
    maxHeight: 300,
  },
  column: columnStyle,
  row: rowStyle,
  boldMessage: {
    fontWeight: 'bold',
  },
  codeMessage: {
    display: 'block',
    fontFamily: `'source-code-pro', Menlo, 'Courier New', Consolas, monospace`,
    borderRadius: 4,
    padding: '4px 8px',
    backgroundColor: 'rgba(0,0,0,0.02)',
    border: '1px solid rgba(0,0,0,0.05)',
  },
})

export type PaneBase = {
  title?: string
  style?: CSSProperties
}
export type StackPane = PaneBase & {
  type: 'stack'
  children: Pane[]
}
export type EditorPane = PaneBase & {
  type: 'editor'
}
export type TranspilerPane = PaneBase & {
  type: 'transpiler'
}
export type PlayerPane = PaneBase & {
  type: 'player'
  platform?: string
  scale?: number
  width?: number
  assetRoot?: string
  vendorComponents: ComponentDescription[]
  styleSheet?: string
  css?: string
  prelude: string
  statusBarHeight: number
  statusBarColor: string
}
export type WorkspacesPane = PaneBase & {
  type: 'workspaces'
}
export type ConsolePane = PaneBase &
  ConsoleOptions & {
    type: 'console'
  }
export type PaneObject =
  | StackPane
  | EditorPane
  | TranspilerPane
  | PlayerPane
  | WorkspacesPane
  | ConsolePane
export type PaneShorthand = PaneObject['type']
export type Pane = PaneShorthand | PaneObject
export type ResponsivePaneSet = {
  maxWidth: number
  panes: Pane[]
}

export type PublicError = {
  lineNumber?: number
  errorMessage: string
  summary: string
  description: string
}

interface ConsoleOptions {
  showFileName: boolean
  showLineNumber: boolean
  renderReactElements: boolean
}

interface EmbeddedPaneOptions {
  enabled: boolean
  visible: boolean
  maximized: boolean
  collapsible: boolean
}

type EmbeddedConsoleOptions = ConsoleOptions & EmbeddedPaneOptions

interface PlaygroundOptions {
  enabled: boolean
  renderReactElements: boolean
  debounceDuration: number
}

interface TypeScriptOptions {
  enabled: false
  libs?: string[]
  types?: string[]
}

export interface Props {
  title: string
  description: string
  files: Record<string, string>
  entry: string
  initialTab: string
  onChange: (files: Record<string, string>) => void
  // platform?: string
  // scale?: number
  // width?: number
  // assetRoot?: string
  // vendorComponents: unknown[]
  externalStyles: Record<string, CSSProperties>
  fullscreen: boolean
  sharedEnvironment: boolean
  // playerStyleSheet?: string
  // playerCSS?: string
  // prelude: string
  responsivePaneSets: ResponsivePaneSet[]
  consoleOptions: EmbeddedConsoleOptions
  playgroundOptions: PlaygroundOptions
  typescriptOptions: TypeScriptOptions
  workspaces: Props[]
  diff: Record<string, WorkspaceDiff>
  // statusBarHeight: number
  // statusBarColor: string
  activeStepIndex: number
  onChangeActiveStepIndex: (index: number) => void
}

interface State {
  compilerError?: PublicError
  runtimeError?: PublicError
  showDetails: boolean
  showLogs: boolean
  logs: LogCommand[]
  activeFile: string
  transpilerCache: Record<string, string>
  transpilerVisible: boolean
  playerVisible: boolean
  fileTabs: Tab[]
  activeFileTab?: Tab
  paneSetIndex: number
}

export default class Workspace extends PureComponent<Props, State> {
  static defaultProps = {
    title: 'Live Editor',
    files: { ['index.js']: '' },
    entry: 'index.js',
    initialTab: 'index.js',
    onChange: () => {},
    platform: null,
    scale: null,
    width: null,
    assetRoot: null,
    vendorComponents: [],
    externalStyles: {},
    fullscreen: false,
    sharedEnvironment: true,
    playerStyleSheet: null,
    playerCSS: null,
    prelude: '',
    responsivePaneSets: [],
    consoleOptions: {},
    playgroundOptions: {},
    typescriptOptions: {},
    workspaces: [],
    diff: {},
    statusBarHeight: 0,
    statusBarColor: 'black',
  }

  codeCache: Record<string, string> = {}
  playerCache: Record<string, string> = {}
  player?: PlayerFrame

  constructor(props: Props) {
    super(props)

    const {
      initialTab,
      responsivePaneSets,
      consoleOptions,
      files,
      diff,
      typescriptOptions,
    } = props

    const fileTabs: Tab[] = Object.keys(files).map((filename, index) => {
      return {
        title: filename,
        changed: diff[filename] ? diff[filename].ranges.length > 0 : false,
        index,
      }
    })

    if (
      typescriptOptions.enabled &&
      Object.keys(files).filter((file) => file.match(/\.tsx?/)).length === 0
    ) {
      console.warn('TypeScript is enabled but there are no .ts or .tsx files.')
    }

    let initialWindowWidth

    if (typeof window !== 'undefined') {
      initialWindowWidth = window.outerWidth

      if (responsivePaneSets.length > 1) {
        window.addEventListener('resize', () => {
          const nextIndex = findPaneSetIndex(
            responsivePaneSets,
            window.outerWidth
          )

          if (nextIndex !== this.state.paneSetIndex) {
            this.setState(
              {
                paneSetIndex: nextIndex,
              },
              () => {
                // We may be rendering a different player pane, so we need to re-run
                this.runApplication()
              }
            )
          }
        })
      }
    }

    const paneSetIndex = findPaneSetIndex(
      responsivePaneSets,
      initialWindowWidth
    )
    const panes = responsivePaneSets[paneSetIndex].panes

    this.state = {
      compilerError: undefined,
      runtimeError: undefined,
      showDetails: false,
      showLogs: consoleOptions.visible,
      logs: [],
      activeFile: initialTab,
      transpilerCache: {},
      transpilerVisible: containsPane(panes, 'transpiler'),
      playerVisible: containsPane(panes, 'player'),
      fileTabs,
      activeFileTab: fileTabs.find((tab) => tab.title === initialTab),
      paneSetIndex,
    }

    babelWorker.addEventListener('message', this.onBabelWorkerMessage)
  }

  componentWillUnmount() {
    babelWorker.removeEventListener('message', this.onBabelWorkerMessage)
  }

  componentDidMount() {
    if (typeof navigator !== 'undefined') {
      const { files, typescriptOptions } = this.props
      const { playerVisible, transpilerVisible } = this.state

      // Cache and compile each file
      Object.keys(files).forEach((filename) => {
        const code = files[filename]

        this.codeCache[filename] = code

        this.runTypeScriptRequest({
          type: 'libs',
          libs: typescriptOptions.libs || [],
          types: typescriptOptions.types || [],
        })

        this.runTypeScriptRequest({
          type: 'file',
          filename,
          code,
        })

        if (playerVisible) {
          babelWorker.postMessage({
            filename,
            code,
            options: { retainLines: true },
          })
        }

        if (transpilerVisible) {
          babelWorker.postMessage({
            filename: getTranspilerId(filename),
            code,
          })
        }
      })
    }
  }

  runApplication = () => {
    const { playerCache, player } = this
    const { entry, files } = this.props

    // Run the app once we've transformed each file at least once
    if (
      player &&
      Object.keys(files).every((filename) => playerCache[filename])
    ) {
      this.clearLogs()
      player.runApplication(playerCache, entry)
    }
  }

  onBabelWorkerMessage = ({ data }: MessageEvent) => {
    const { playerCache } = this
    const { transpilerCache } = this.state
    const babelMessage = JSON.parse(data) as BabelWorkerMessage

    this.updateStatus(babelMessage)

    if (babelMessage.type === 'code') {
      const { filename, code } = babelMessage

      if (isTranspilerId(filename)) {
        this.setState({
          transpilerCache: {
            ...transpilerCache,
            [filename]: code,
          },
        })
      } else {
        playerCache[filename] = code
        this.runApplication()
      }
    }
  }

  updateStatus = (babelMessage: BabelWorkerMessage) => {
    switch (babelMessage.type) {
      case 'code':
        this.setState({
          compilerError: undefined,
          showDetails: false,
        })
        break
      case 'error':
        this.setState({
          compilerError: getErrorDetails(babelMessage.error.message),
        })
        break
    }
  }

  typeScriptWorker?: Promise<any>

  runTypeScriptRequest = (payload: TypeScriptRequest) => {
    if (!this.props.typescriptOptions.enabled) {
      return Promise.resolve()
    }

    if (!this.typeScriptWorker) {
      this.typeScriptWorker = import(
        '../../typescript-worker.js'
      ).then((worker) => (worker as any).default())
    }

    return this.typeScriptWorker.then((worker: unknown) =>
      workerRequest(worker, payload)
    )
  }

  getTypeScriptInfo = (
    prefixedFilename: string,
    index: number,
    done: (info: ts.QuickInfo) => void
  ): void => {
    const [, filename] = prefixedFilename.split(':')

    this.runTypeScriptRequest({
      type: 'quickInfo',
      filename,
      position: index,
    })
      .then((info?: ts.QuickInfo) => {
        if (info && info.displayParts && info.displayParts.length > 0) {
          done(info)
        }
      })
      .catch((error: unknown) => {
        console.log('Error finding type info', error)
      })
  }

  onCodeChange = (code: string) => {
    const { activeFile, transpilerVisible, playerVisible } = this.state

    this.runTypeScriptRequest({
      type: 'file',
      filename: activeFile,
      code,
    })

    if (playerVisible) {
      babelWorker.postMessage({
        filename: activeFile,
        code,
        options: { retainLines: true },
      })
    }

    if (transpilerVisible) {
      babelWorker.postMessage({
        filename: getTranspilerId(activeFile),
        code,
      })
    }

    this.codeCache[activeFile] = code
    this.props.onChange(this.codeCache)
  }

  onToggleDetails = (showDetails: boolean) => {
    this.setState({ showDetails })
  }

  onToggleLogs = (showLogs: boolean) => {
    this.setState({ showLogs })
  }

  onPlayerRun = () => {
    this.setState({ runtimeError: undefined })
  }

  // TODO: Runtime errors should indicate which file they're coming from,
  // and only cause a line highlight on that file.
  onPlayerError = (message: string) => {
    this.setState({ runtimeError: getErrorDetails(message) })
  }

  onPlayerConsole = (payload: ConsoleCommand) => {
    const { consoleOptions, playgroundOptions } = this.props
    const { logs } = this.state

    if (consoleOptions.enabled || playgroundOptions.enabled) {
      switch (payload.command) {
        case 'log':
          this.setState({ logs: logs.concat(payload) })
          break
        case 'clear':
          this.clearLogs()
          break
      }
    }
  }

  clearLogs() {
    const { logs } = this.state

    if (logs.length === 0) return

    this.setState({ logs: [] })
  }

  onClickTab = (tab: Tab) => {
    this.setState({
      activeFile: tab.title,
      activeFileTab: tab,
    })
  }

  renderEditor = (key: number, options: EditorPane) => {
    const {
      files,
      externalStyles,
      fullscreen,
      activeStepIndex,
      diff,
      playgroundOptions,
      typescriptOptions,
    } = this.props
    const {
      compilerError,
      runtimeError,
      showDetails,
      activeFile,
      activeFileTab,
      fileTabs,
      logs,
    } = this.state

    const { title } = options

    const fileDiff = diff[activeFile] ? diff[activeFile].ranges : []

    const error = compilerError || runtimeError
    const isError = !!error

    const style = mergeStyles(styles.editorPane, options.style)

    return (
      <div key={key} style={style}>
        {title && (
          <Header
            text={title}
            headerStyle={externalStyles.header}
            textStyle={externalStyles.headerText}
          >
            {fullscreen && <Fullscreen textStyle={externalStyles.headerText} />}
          </Header>
        )}
        {fileTabs.length > 1 && (
          <Tabs
            tabs={fileTabs}
            getTitle={getTabTitle}
            getChanged={getTabChanged}
            activeTab={activeFileTab}
            compareTabs={compareTabs}
            onClickTab={this.onClickTab}
            tabStyle={externalStyles.tab}
            textStyle={externalStyles.tabText}
            activeTextStyle={externalStyles.tabTextActive}
            changedTextStyle={externalStyles.tabTextChanged}
          >
            {fullscreen && !title && (
              <Fullscreen textStyle={externalStyles.tabText} />
            )}
          </Tabs>
        )}
        <Editor
          key={activeFile}
          initialValue={files[activeFile]}
          filename={activeStepIndex + ':' + activeFile}
          onChange={this.onCodeChange}
          errorLineNumber={error?.lineNumber}
          showDiff={true}
          diff={fileDiff}
          logs={playgroundOptions.enabled ? logs : undefined}
          playgroundDebounceDuration={playgroundOptions.debounceDuration}
          playgroundRenderReactElements={playgroundOptions.renderReactElements}
          getTypeInfo={
            typescriptOptions.enabled ? this.getTypeScriptInfo : undefined
          }
          tooltipStyle={externalStyles.tooltip}
        />
        {showDetails && (
          <div style={styles.overlayContainer}>
            <div style={styles.overlay}>
              <Overlay isError={isError}>
                {isError ? (
                  <>
                    <b style={styles.boldMessage}>{error?.description}</b>
                    <br />
                    <br />
                    <code style={styles.codeMessage}>
                      {error?.errorMessage}
                    </code>
                    <br />
                  </>
                ) : (
                  ''
                )}
                <About />
              </Overlay>
            </div>
          </div>
        )}
        <Status text={!!error ? error.summary : 'No Errors'} isError={isError}>
          <Button
            active={showDetails}
            isError={isError}
            onChange={this.onToggleDetails}
          >
            {'Show Details'}
          </Button>
        </Status>
      </div>
    )
  }

  renderTranspiler = (key: number, options: TranspilerPane) => {
    const { externalStyles } = this.props
    const { activeFile, transpilerCache } = this.state

    const { title } = options

    const style = mergeStyles(styles.transpilerPane, options.style)

    return (
      <div key={key} style={style}>
        {title && (
          <Header
            text={title}
            headerStyle={externalStyles.transpilerHeader}
            textStyle={externalStyles.transpilerHeaderText}
          />
        )}
        <Editor
          key={getTranspilerId(activeFile)}
          readOnly={true}
          value={transpilerCache[getTranspilerId(activeFile)]}
          filename={getTranspilerId(activeFile)}
        />
      </div>
    )
  }

  renderWorkspaces = (key: number, options: WorkspacesPane) => {
    const {
      externalStyles,
      workspaces,
      activeStepIndex,
      onChangeActiveStepIndex,
    } = this.props

    const { title } = options

    const style = mergeStyles(
      styles.workspacesPane,
      externalStyles.workspacesPane,
      options.style
    )

    return (
      <div key={key} style={style}>
        {title && (
          <Header
            text={title}
            headerStyle={externalStyles.workspacesHeader}
            textStyle={externalStyles.workspacesHeaderText}
          />
        )}
        <WorkspacesList
          key={key}
          steps={workspaces}
          activeStepIndex={activeStepIndex}
          onChangeActiveStepIndex={onChangeActiveStepIndex}
          style={externalStyles.workspacesList}
          rowStyle={externalStyles.workspacesRow}
          rowStyleActive={externalStyles.workspacesRowActive}
          rowTitleStyle={externalStyles.workspacesRowTitle}
          rowTitleStyleActive={externalStyles.workspacesRowTitleActive}
          descriptionStyle={externalStyles.workspacesDescription}
          descriptionTextStyle={externalStyles.workspacesDescriptionText}
          buttonTextStyle={externalStyles.workspacesButtonText}
          buttonContainerStyle={externalStyles.workspacesButtonContainer}
          buttonWrapperStyle={externalStyles.workspacesButtonWrapper}
          dividerStyle={externalStyles.workspacesDivider}
        />
      </div>
    )
  }

  renderPlayer = (key: number, options: PlayerPane) => {
    const {
      files,
      externalStyles,
      consoleOptions,
      sharedEnvironment,
    } = this.props
    const { showLogs, logs } = this.state

    const {
      title,
      width,
      scale,
      platform,
      assetRoot,
      vendorComponents,
      styleSheet,
      css,
      prelude,
      statusBarHeight,
      statusBarColor,
    } = options

    const style = mergeStyles(
      styles.playerPane,
      externalStyles.playerPane,
      options.style
    )

    return (
      <div key={key} style={style}>
        {title && (
          <Header
            text={title}
            headerStyle={externalStyles.playerHeader}
            textStyle={externalStyles.playerHeaderText}
          />
        )}
        <div style={styles.column}>
          <div style={styles.row}>
            <PlayerFrame
              ref={(ref) => {
                this.player = ref || undefined
              }}
              width={width}
              scale={scale}
              platform={platform}
              assetRoot={assetRoot}
              vendorComponents={vendorComponents}
              styleSheet={styleSheet}
              css={css}
              prelude={prelude}
              statusBarHeight={statusBarHeight}
              statusBarColor={statusBarColor}
              sharedEnvironment={sharedEnvironment}
              onRun={this.onPlayerRun}
              onError={this.onPlayerError}
              onConsole={this.onPlayerConsole}
            />
            {consoleOptions.enabled && showLogs && (
              <Console
                style={externalStyles.consolePane}
                rowStyle={externalStyles.consoleRow}
                maximize={consoleOptions.maximized}
                showFileName={
                  Object.keys(files).length > 1 && consoleOptions.showFileName
                }
                showLineNumber={consoleOptions.showLineNumber}
                logs={logs}
                renderReactElements={consoleOptions.renderReactElements}
              />
            )}
          </div>
          {consoleOptions.enabled && consoleOptions.collapsible !== false && (
            <Status
              text={'Logs' + (showLogs ? '' : ` (${logs.length})`)}
              isError={false}
            >
              <Button active={showLogs} onChange={this.onToggleLogs}>
                {'Show Logs'}
              </Button>
            </Status>
          )}
        </div>
      </div>
    )
  }

  renderConsole = (key: number, options: ConsolePane) => {
    const { logs } = this.state

    const { files, externalStyles } = this.props

    const style =
      externalStyles.consolePane || options.style
        ? {
            ...styles.consolePane,
            ...externalStyles.consolePane,
            ...options.style,
          }
        : styles.consolePane

    return (
      <div key={key} style={style}>
        {options.title && (
          <Header
            text={options.title}
            headerStyle={externalStyles.playerHeader}
            textStyle={externalStyles.playerHeaderText}
          />
        )}
        <div style={styles.column}>
          <div style={styles.row}>
            <Console
              style={externalStyles.consolePane}
              rowStyle={externalStyles.consoleRow}
              maximize={true}
              showFileName={
                Object.keys(files).length > 1 && options.showFileName
              }
              showLineNumber={options.showLineNumber}
              logs={logs}
              renderReactElements={options.renderReactElements}
            />
          </div>
        </div>
      </div>
    )
  }

  renderStack = (key: number, options: StackPane) => {
    const { externalStyles } = this.props

    const { children } = options

    const tabs: (Tab & { pane: Pane })[] = children
      .map(normalizePane)
      .map((pane, i) => ({
        title: pane.title || pane.type,
        index: i,
        pane,
        changed: false,
      }))

    return (
      <TabContainer
        key={key}
        tabs={tabs}
        getTitle={getTabTitle}
        initialTab={tabs[0]}
        tabStyle={externalStyles.stackTab || externalStyles.tab}
        textStyle={externalStyles.stackTabText || externalStyles.tabText}
        activeTextStyle={
          externalStyles.stackTabTextActive || externalStyles.tabTextActive
        }
        renderHiddenContent={true}
        compareTabs={compareTabs}
        renderContent={(tab) => this.renderPane(tab.pane, tab.index)}
      />
    )
  }

  renderPane = (pane: Pane, key: number) => {
    const paneObject = normalizePane(pane)

    switch (paneObject.type) {
      case 'editor':
        return this.renderEditor(key, paneObject)
      case 'transpiler':
        return this.renderTranspiler(key, paneObject)
      case 'player':
        return this.renderPlayer(key, paneObject)
      case 'workspaces':
        return this.renderWorkspaces(key, paneObject)
      case 'stack':
        return this.renderStack(key, paneObject)
      case 'console':
        return this.renderConsole(key, paneObject)
      default:
        return `Unknown pane type: ${paneObject['type']}`
    }
  }

  render() {
    const { responsivePaneSets } = this.props
    const { paneSetIndex } = this.state
    const panes = responsivePaneSets[paneSetIndex].panes

    return <div style={styles.container}>{panes.map(this.renderPane)}</div>
  }
}