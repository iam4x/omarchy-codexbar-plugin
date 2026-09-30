import QtQuick
import qs.Commons
import "UsageModel.js" as UsageModel

// One rate window inside a provider column: title and remaining percent, a
// health-style meter that drains as usage grows with a tick at the pace
// target, then the reset countdown.
Column {
  id: root

  property var usageWindow: null
  property real nowMs: Date.now()
  property color foreground: Color.foreground
  property string fontFamily: Style.font.family

  readonly property real remainingPercent: root.usageWindow ? root.usageWindow.remainingPercent : 0
  readonly property var pace: root.usageWindow ? root.usageWindow.pace : null
  readonly property bool hasPaceTarget: !!root.pace
  readonly property color dim: Qt.darker(root.foreground, 1.4)
  readonly property color healthColor: root.remainingPercent <= 10 ? "#f7768e"
    : root.remainingPercent <= 25 ? "#ff9e64"
    : root.remainingPercent <= 50 ? "#e0af68"
    : "#9ece6a"

  width: parent ? parent.width : implicitWidth
  spacing: Style.space(4)

  Item {
    width: parent.width
    implicitHeight: Math.max(titleText.implicitHeight, percentText.implicitHeight)

    Text {
      id: titleText
      textFormat: Text.PlainText
      anchors.left: parent.left
      anchors.right: percentText.left
      anchors.rightMargin: Style.space(8)
      anchors.verticalCenter: parent.verticalCenter
      text: root.usageWindow ? root.usageWindow.title : ""
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: Style.font.body
      elide: Text.ElideRight
    }

    Text {
      id: percentText
      textFormat: Text.PlainText
      anchors.right: parent.right
      anchors.verticalCenter: parent.verticalCenter
      text: Math.round(root.remainingPercent) + "%"
      color: root.healthColor
      font.family: root.fontFamily
      font.pixelSize: Style.font.body
      font.bold: true
    }
  }

  Item {
    width: parent.width
    implicitHeight: Style.space(6)

    Rectangle {
      id: track
      anchors.fill: parent
      radius: height / 2
      color: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.12)
    }

    Rectangle {
      anchors.left: track.left
      anchors.verticalCenter: track.verticalCenter
      height: track.height
      radius: track.radius
      visible: root.remainingPercent > 0
      width: Math.max(track.height, track.width * root.remainingPercent / 100)
      color: root.healthColor

      Behavior on width { NumberAnimation { duration: 320; easing.type: Easing.OutCubic } }
      Behavior on color { ColorAnimation { duration: 220 } }
    }

    // Where the meter should sit if usage were spread evenly over the window.
    Rectangle {
      visible: root.hasPaceTarget
      width: Math.max(1, Style.space(2))
      height: track.height + Style.space(6)
      radius: width / 2
      anchors.verticalCenter: track.verticalCenter
      x: Math.round(track.width * (100 - (root.hasPaceTarget ? root.pace.expectedUsedPercent : 0)) / 100 - width / 2)
      color: root.foreground
      opacity: 0.7
    }
  }

  Text {
    textFormat: Text.PlainText
    visible: text !== ""
    text: root.usageWindow ? UsageModel.formatResetIn(root.usageWindow.resetsAtMs, root.nowMs) : ""
    color: root.dim
    font.family: root.fontFamily
    font.pixelSize: Style.font.bodySmall
  }
}
