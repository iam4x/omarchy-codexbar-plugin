import QtQuick

Item {
  id: root

  property var providerUsage: null
  property bool vertical: false
  property color foreground: "white"
  property string fontFamily: ""
  property real fontSize: 12
  readonly property string iconBase: root.providerUsage ? String(root.providerUsage.icon || "") : ""
  readonly property real iconSize: Math.max(1, root.fontSize)

  implicitWidth: vertical ? verticalContent.implicitWidth : horizontalContent.implicitWidth
  implicitHeight: vertical ? verticalContent.implicitHeight : horizontalContent.implicitHeight

  Row {
    id: horizontalContent
    visible: !root.vertical
    spacing: 4

    ProviderIcon {
      anchors.verticalCenter: parent.verticalCenter
      icon: root.iconBase
      size: root.iconSize
      foreground: root.foreground
      fontFamily: root.fontFamily
    }

    Text {
      text: root.providerUsage ? root.providerUsage.remainingLabel : "--%"
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: root.fontSize
    }

    Text {
      text: root.providerUsage ? root.providerUsage.resetLabel : "--"
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: root.fontSize
    }
  }

  Column {
    id: verticalContent
    visible: root.vertical
    spacing: 1

    ProviderIcon {
      anchors.horizontalCenter: parent.horizontalCenter
      icon: root.iconBase
      size: root.iconSize
      foreground: root.foreground
      fontFamily: root.fontFamily
    }

    Text {
      anchors.horizontalCenter: parent.horizontalCenter
      text: root.providerUsage ? root.providerUsage.remainingLabel : "--%"
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: root.fontSize
    }

    Text {
      anchors.horizontalCenter: parent.horizontalCenter
      text: root.providerUsage ? root.providerUsage.resetLabel : "--"
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: root.fontSize
    }
  }
}
