import QtQuick
import qs.Ui

BarWidget {
  id: root

  moduleName: "iam4x.codexbar"

  readonly property var usageService: bar && bar.shell ? bar.shell.serviceFor(moduleName) : null
  readonly property var providerRows: usageService ? usageService.rows : []
  readonly property bool hasRows: providerRows && providerRows.length > 0
  readonly property bool refreshing: usageService ? usageService.refreshing : false

  visible: hasRows
  implicitWidth: root.vertical
    ? Math.max(root.barSize, verticalProviders.implicitWidth + button.scaledHorizontalMargin * 2)
    : horizontalProviders.implicitWidth + button.scaledHorizontalMargin * 2
  implicitHeight: root.vertical
    ? verticalProviders.implicitHeight + button.scaledVerticalPadding * 2
    : root.barSize

  function refresh() {
    if (usageService) usageService.refresh()
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    labelVisible: false
    hasVisualContent: root.hasRows

    onPressed: function(buttonPressed) {
      if (buttonPressed === Qt.LeftButton) root.refresh()
    }

    Item {
      id: providerContent
      anchors.fill: parent

      Row {
        id: horizontalProviders
        visible: !root.vertical
        anchors.centerIn: parent
        spacing: 8

        Repeater {
          model: root.providerRows
          delegate: ProviderUsageItem {
            providerUsage: modelData
            vertical: false
            foreground: button.foreground
            fontFamily: button.fontFamily
            fontSize: button.fontSize
          }
        }
      }

      Column {
        id: verticalProviders
        visible: root.vertical
        anchors.centerIn: parent
        spacing: 6

        Repeater {
          model: root.providerRows
          delegate: ProviderUsageItem {
            providerUsage: modelData
            vertical: true
            foreground: button.foreground
            fontFamily: button.fontFamily
            fontSize: button.fontSize
          }
        }
      }
    }

    SequentialAnimation {
      id: refreshPulse
      running: root.refreshing && root.hasRows
      loops: Animation.Infinite

      onRunningChanged: if (!running) providerContent.opacity = 1

      NumberAnimation {
        target: providerContent
        property: "opacity"
        from: 1
        to: 0.68
        duration: 850
        easing.type: Easing.InOutSine
      }

      NumberAnimation {
        target: providerContent
        property: "opacity"
        from: 0.68
        to: 1
        duration: 850
        easing.type: Easing.InOutSine
      }
    }
  }
}
