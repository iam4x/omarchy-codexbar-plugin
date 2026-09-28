import QtQuick

Item {
  id: root

  property string icon: ""
  property color foreground: "white"
  property string fontFamily: ""
  property real size: 12
  readonly property bool useLightIcon: root.foreground.r + root.foreground.g + root.foreground.b >= 1.5
  readonly property var iconAssetMap: ({
    "grok-bot": {
      dark: "assets/icons/grok-bot.png",
      light: "assets/icons/grok-bot.png"
    }
  })
  readonly property string iconAssetPath: {
    var assets = root.iconAssetMap[root.icon]
    return assets ? assets[root.useLightIcon ? "light" : "dark"] || "" : ""
  }
  readonly property url iconSource: root.icon === ""
    ? ""
    : root.iconAssetPath !== ""
      ? Qt.resolvedUrl(root.iconAssetPath)
      : Qt.resolvedUrl("assets/icons/" + root.icon + (root.useLightIcon ? "-light" : "") + ".svg")

  implicitWidth: root.size
  implicitHeight: root.size

  Image {
    anchors.fill: parent
    visible: root.iconSource !== ""
    source: root.iconSource
    sourceSize: Qt.size(root.size * 2, root.size * 2)
    fillMode: Image.PreserveAspectFit
    smooth: true
  }

  Text {
    anchors.fill: parent
    visible: root.iconSource === ""
    text: "?"
    color: root.foreground
    font.family: root.fontFamily
    font.pixelSize: root.size
    horizontalAlignment: Text.AlignHCenter
    verticalAlignment: Text.AlignVCenter
  }
}
