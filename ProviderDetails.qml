import QtQuick
import qs.Commons
import qs.Ui

// One provider column in the usage panel: identity header, every rate
// window, then credits and any detail sections CodexBar returns.
BorderSurface {
  id: root

  property var providerUsage: null
  property real nowMs: Date.now()
  property color foreground: Color.foreground
  property string fontFamily: Style.font.family

  readonly property var info: root.providerUsage && root.providerUsage.info ? root.providerUsage.info : ({})
  readonly property var windows: root.providerUsage && root.providerUsage.windows ? root.providerUsage.windows : []
  readonly property var sections: root.info.sections ? root.info.sections : []
  readonly property string errorText: root.providerUsage && root.providerUsage.error ? String(root.providerUsage.error) : ""
  readonly property color dim: Qt.darker(root.foreground, 1.4)

  implicitHeight: body.implicitHeight + contentTopInset + contentBottomInset
  padding: Style.space(10)
  radius: Style.cornerRadius
  color: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.04)

  Column {
    id: body
    x: root.contentLeftInset
    y: root.contentTopInset
    width: root.width - root.contentLeftInset - root.contentRightInset
    spacing: Style.space(8)

    PanelHero {
      width: parent.width
      title: root.info.displayName || (root.providerUsage ? root.providerUsage.provider : "")
      foreground: root.foreground
      fontFamily: root.fontFamily
      iconComponent: Component {
        ProviderIcon {
          icon: root.providerUsage ? String(root.providerUsage.icon || "") : ""
          size: Math.round(Style.font.title * 1.3)
          foreground: root.foreground
          fontFamily: root.fontFamily
        }
      }
    }

    PanelSeparator { foreground: root.foreground }

    PanelSectionHeader {
      text: "USAGE"
      foreground: root.foreground
      fontFamily: root.fontFamily
    }

    Text {
      textFormat: Text.PlainText
      width: parent.width
      visible: root.errorText !== ""
      text: root.errorText
      color: Color.urgent
      font.family: root.fontFamily
      font.pixelSize: Style.font.bodySmall
      wrapMode: Text.Wrap
    }

    Repeater {
      model: root.windows
      delegate: UsageWindowRow {
        width: body.width
        usageWindow: modelData
        nowMs: root.nowMs
        foreground: root.foreground
        fontFamily: root.fontFamily
      }
    }

    Repeater {
      model: root.sections
      delegate: Column {
        required property var modelData
        width: body.width
        spacing: Style.space(6)

        PanelSeparator { foreground: root.foreground }

        PanelSectionHeader {
          text: String(modelData.title || "").toUpperCase()
          foreground: root.foreground
          fontFamily: root.fontFamily
        }

        Repeater {
          model: modelData.rows
          delegate: Item {
            required property var modelData
            width: body.width
            implicitHeight: Math.max(labelText.implicitHeight, valueText.implicitHeight)

            Text {
              id: labelText
              textFormat: Text.PlainText
              anchors.left: parent.left
              anchors.right: valueText.left
              anchors.rightMargin: Style.space(8)
              anchors.verticalCenter: parent.verticalCenter
              text: modelData.label
              color: root.dim
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
              elide: Text.ElideRight
            }

            Text {
              id: valueText
              textFormat: Text.PlainText
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              text: modelData.value
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.body
              font.bold: true
            }
          }
        }
      }
    }
  }
}
