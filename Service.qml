import QtQuick
import Quickshell.Io
import "UsageModel.js" as UsageModel

Item {
  id: root

  property var internalSnapshot: UsageModel.emptySnapshot()
  property string stdoutText: ""
  property string stderrText: ""
  property bool activeRun: false
  property int processExitCode: 0
  property bool processExited: false
  property bool stdoutFinished: false
  property bool stderrFinished: false

  readonly property var snapshot: internalSnapshot
  readonly property var rows: internalSnapshot.providers
  readonly property bool refreshing: root.activeRun

  function refresh() {
    if (root.activeRun || usageProcess.running) return

    activeRun = true
    processExited = false
    stdoutFinished = false
    stderrFinished = false
    processExitCode = 0
    stdoutText = ""
    stderrText = ""
    internalSnapshot = UsageModel.loadingSnapshot(internalSnapshot, Date.now())
    watchdog.restart()
    usageProcess.running = true
  }

  function maybeFinish() {
    if (!activeRun || !processExited || !stdoutFinished || !stderrFinished) return
    finishRefresh(processExitCode, "")
  }

  function finishRefresh(exitCode, failure) {
    if (!activeRun) return
    activeRun = false
    watchdog.stop()
    internalSnapshot = UsageModel.fromProcessResult(internalSnapshot, exitCode, stdoutText, failure || stderrText, Date.now())
  }

  Timer {
    interval: 300000
    repeat: true
    running: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  Timer {
    id: watchdog
    interval: 30000
    repeat: false
    onTriggered: {
      if (!root.activeRun) return
      root.finishRefresh(124, "CodexBar did not respond within 30 seconds.")
      usageProcess.running = false
    }
  }

  Process {
    id: usageProcess
    command: ["codexbar", "usage", "--format", "json", "--json-only"]

    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: {
        root.stdoutText = String(text || "")
        root.stdoutFinished = true
        root.maybeFinish()
      }
    }

    stderr: StdioCollector {
      waitForEnd: true
      onStreamFinished: {
        root.stderrText = String(text || "")
        root.stderrFinished = true
        root.maybeFinish()
      }
    }

    onExited: function(exitCode) {
      root.processExitCode = exitCode
      root.processExited = true
      root.maybeFinish()
    }
  }

  Component.onCompleted: root.refresh()
}
