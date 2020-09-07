import React, { useMemo, useState } from 'react'
import screenfull from 'screenfull'
import diff, { DiffRange } from '../../utils/Diff'
import { InternalOptions, WorkspaceStep } from '../../utils/options'
import { prefix } from '../../utils/Styles'
import Workspace, { Props as WorkspaceProps } from './Workspace'

const style = prefix({
  flex: '1 1 auto',
  display: 'flex',
  alignItems: 'stretch',
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
})

export type WorkspaceDiff = {
  type: 'added' | 'changed'
  ranges: DiffRange[]
}

function workspacesStepDiff(
  targetStep: WorkspaceStep,
  sourceStep: WorkspaceStep
): Record<string, WorkspaceDiff> {
  const {
    workspace: { files: sourceFiles },
  } = sourceStep
  const {
    workspace: { files: targetFiles },
  } = targetStep

  const result: Record<string, WorkspaceDiff> = {}

  Object.keys(targetFiles).forEach((filename: string) => {
    const exists = filename in sourceFiles
    const source = sourceFiles[filename] ?? ''
    const lineDiff = diff(source, targetFiles[filename])

    result[filename] = {
      type: exists ? 'changed' : 'added',
      ranges: lineDiff.added,
    }
  })

  return result
}

type Props = Omit<InternalOptions, 'css'> & {
  onChange: (files: Record<string, string>) => void
}

export default function App({
  title,
  files,
  entry,
  initialTab,
  styles,
  sharedEnvironment,
  fullscreen,
  responsivePaneSets,
  panes,
  playground,
  workspaces,
  typescript,
  onChange,
}: Props) {
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  const diff: WorkspaceProps['diff'] =
    workspaces.length > 0 && activeStepIndex > 0
      ? workspacesStepDiff(
          workspaces[activeStepIndex],
          workspaces[activeStepIndex - 1]
        )
      : {}

  const paneSets = useMemo(() => {
    return [...responsivePaneSets, { panes: panes, maxWidth: Infinity }]
  }, [responsivePaneSets])

  return (
    <div style={style}>
      <Workspace
        key={activeStepIndex}
        title={title}
        files={files}
        entry={entry}
        initialTab={initialTab}
        externalStyles={styles}
        sharedEnvironment={sharedEnvironment}
        fullscreen={fullscreen && (screenfull as any).enabled}
        responsivePaneSets={paneSets}
        workspaces={workspaces}
        onChange={onChange}
        playgroundOptions={playground}
        typescriptOptions={typescript}
        activeStepIndex={activeStepIndex}
        onChangeActiveStepIndex={setActiveStepIndex}
        diff={diff}
        // Merge props from the current workspace step
        {...(workspaces.length > 0
          ? workspaces[activeStepIndex].workspace
          : {})}
      />
    </div>
  )
}