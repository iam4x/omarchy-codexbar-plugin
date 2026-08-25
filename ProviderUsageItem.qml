import QtQuick

Item {
  id: root

  property var providerUsage: null
  property bool vertical: false
  property color foreground: "white"
  property string fontFamily: ""
  property real fontSize: 12
  readonly property string iconBase: root.providerUsage ? String(root.providerUsage.icon || "") : ""
  readonly property bool useLightIcon: root.foreground.r + root.foreground.g + root.foreground.b >= 1.5
  readonly property url iconSource: root.iconBase === ""
    ? ""
    : Qt.resolvedUrl("assets/icons/" + root.iconBase + (root.useLightIcon ? "-light" : "") + ".svg")
  readonly property real iconSize: Math.max(1, root.fontSize)

  implicitWidth: vertical ? verticalContent.implicitWidth : horizontalContent.implicitWidth
  implicitHeight: vertical ? verticalContent.implicitHeight : horizontalContent.implicitHeight

  Row {
    id: horizontalContent
    visible: !root.vertical
    spacing: 4

    Item {
      width: root.iconSize
      height: root.iconSize
      anchors.verticalCenter: parent.verticalCenter

      Image {
        anchors.fill: parent
        visible: root.iconSource !== ""
        source: root.iconSource
        sourceSize: Qt.size(root.iconSize * 2, root.iconSize * 2)
        fillMode: Image.PreserveAspectFit
        smooth: true
      }

      Text {
        anchors.fill: parent
        visible: root.iconSource === ""
        text: "?"
        color: root.foreground
        font.family: root.fontFamily
        font.pixelSize: root.fontSize
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
      }
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

    Item {
      width: root.iconSize
      height: root.iconSize
      anchors.horizontalCenter: parent.horizontalCenter

      Image {
        anchors.fill: parent
        visible: root.iconSource !== ""
        source: root.iconSource
        sourceSize: Qt.size(root.iconSize * 2, root.iconSize * 2)
        fillMode: Image.PreserveAspectFit
        smooth: true
      }

      Text {
        anchors.fill: parent
        visible: root.iconSource === ""
        text: "?"
        color: root.foreground
        font.family: root.fontFamily
        font.pixelSize: root.fontSize
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
      }
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
