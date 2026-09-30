import QtQuick
import QtQuick.Shapes
import qs.Commons
import qs.Ui

Panel {
  id: root

  moduleName: "iam4x.codexbar"
  ipcTarget: "iam4x.codexbar"

  readonly property var usageService: bar && bar.shell ? bar.shell.serviceFor(moduleName) : null
  readonly property var providerRows: usageService ? usageService.rows : []
  readonly property var snapshot: usageService ? usageService.snapshot : null
  readonly property bool hasRows: providerRows && providerRows.length > 0
  readonly property bool refreshing: usageService ? usageService.refreshing : false
  readonly property bool vertical: bar ? bar.vertical : false
  readonly property int barSize: bar ? bar.barSize : Style.bar.sizeHorizontal

  // Reset countdowns in the panel are relative to this clock, which only
  // ticks while the panel is open.
  property real nowMs: Date.now()

  readonly property color panelForeground: Color.popups.text
  readonly property string panelFontFamily: bar ? bar.fontFamily : Style.font.family
  readonly property int columnWidth: Style.space(240)
  readonly property int columnGap: Style.space(8)
  readonly property real horizontalInset: panel.padding * 2 + Border.left(panel.borderSpec) + Border.right(panel.borderSpec)
  readonly property int maxColumns: Math.max(1, Math.floor((panel.availableCardWidth - root.horizontalInset + root.columnGap) / (root.columnWidth + root.columnGap)))
  readonly property int columnCount: Math.max(1, Math.min(root.providerRows.length, root.maxColumns))

  readonly property string updatedLabel: {
    if (!root.snapshot || !root.snapshot.observedAtMs) return "Not updated yet"
    return "Updated " + Qt.formatTime(new Date(root.snapshot.observedAtMs), "HH:mm")
  }
  readonly property string statusMessage: root.snapshot && root.snapshot.state === "stale" ? String(root.snapshot.message || "") : ""

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

  onOpenedChanged: if (opened) nowMs = Date.now()
  onHasRowsChanged: if (!hasRows) close()

  Timer {
    interval: 30000
    repeat: true
    running: root.opened
    onTriggered: root.nowMs = Date.now()
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    labelVisible: false
    hasVisualContent: root.hasRows

    onPressed: function(buttonPressed) {
      if (buttonPressed === Qt.MiddleButton) root.refresh()
      else if (buttonPressed === Qt.LeftButton) root.toggle()
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

  KeyboardPanel {
    id: panel
    anchorItem: button
    owner: root
    bar: root.bar
    open: root.opened && root.hasRows
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(providerGrid.implicitWidth + root.horizontalInset)
    contentHeight: panel.fittedContentHeight(providerGrid.implicitHeight + layout.spacing + footer.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onMoveRequested: function(dx, dy) {
        if (dy === 0) return
        var maxY = Math.max(0, scroller.contentHeight - scroller.height)
        scroller.contentY = Math.max(0, Math.min(maxY, scroller.contentY + dy * Style.space(60)))
      }
      onTextKey: function(text) { if (text === "r" || text === "R") root.refresh() }

      Item {
        id: layout
        anchors.fill: parent

        readonly property int spacing: Style.space(10)

        Flickable {
          id: scroller
          anchors.left: parent.left
          anchors.right: parent.right
          anchors.top: parent.top
          anchors.bottom: footer.top
          anchors.bottomMargin: layout.spacing
          contentWidth: width
          contentHeight: providerGrid.implicitHeight
          boundsBehavior: Flickable.StopAtBounds
          clip: true

          Grid {
            id: providerGrid
            columns: root.columnCount
            spacing: root.columnGap

            Repeater {
              model: root.providerRows
              delegate: ProviderDetails {
                width: root.columnWidth
                providerUsage: modelData
                nowMs: root.nowMs
                foreground: root.panelForeground
                fontFamily: root.panelFontFamily
              }
            }
          }
        }

        Item {
          id: footer
          anchors.left: parent.left
          anchors.right: parent.right
          anchors.bottom: parent.bottom
          implicitHeight: Math.max(footerLabels.implicitHeight, refreshButton.implicitHeight)
          height: implicitHeight

          Column {
            id: footerLabels
            anchors.left: parent.left
            anchors.right: refreshButton.left
            anchors.rightMargin: Style.space(8)
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.space(2)

            Text {
              textFormat: Text.PlainText
              width: parent.width
              text: root.refreshing ? "Refreshing…" : root.updatedLabel
              color: Qt.darker(root.panelForeground, 1.4)
              font.family: root.panelFontFamily
              font.pixelSize: Style.font.bodySmall
              elide: Text.ElideRight
            }

            Text {
              textFormat: Text.PlainText
              width: parent.width
              visible: root.statusMessage !== ""
              text: root.statusMessage
              color: Color.urgent
              font.family: root.panelFontFamily
              font.pixelSize: Style.font.bodySmall
              elide: Text.ElideRight
            }
          }

          PanelActionButton {
            id: refreshButton
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            foreground: root.panelForeground
            fontFamily: root.panelFontFamily
            enabled: !root.refreshing
            onClicked: root.refresh()

            // Drawn instead of using a font glyph: icon glyphs are not symmetric
            // around their box, so they wobble when rotated. The two-arrow shape is
            // point-symmetric, so its silhouette stays centered at every angle.
            Shape {
              id: refreshIcon
              readonly property real iconSize: 2 * Math.round(refreshButton.fontSize / 2)
              readonly property real center: iconSize / 2
              readonly property real lineWidth: Math.max(1.25, iconSize / 9)
              readonly property real head: lineWidth * 1.35
              readonly property real radius: center - head
              readonly property real sweep: 125
              readonly property real startA: -90 + (180 - sweep) / 2
              readonly property color strokeColor: refreshButton.enabled
                ? (refreshButton._hot ? refreshButton.hoverColor : refreshButton.foreground)
                : Qt.darker(refreshButton.foreground, 2.0)

              function arrowHead(endDegrees) {
                const a = endDegrees * Math.PI / 180
                const ex = center + radius * Math.cos(a)
                const ey = center + radius * Math.sin(a)
                const tx = -Math.sin(a), ty = Math.cos(a)
                const nx = Math.cos(a), ny = Math.sin(a)
                return [
                  Qt.point(ex + nx * head, ey + ny * head),
                  Qt.point(ex + tx * head * 1.3, ey + ty * head * 1.3),
                  Qt.point(ex - nx * head, ey - ny * head),
                  Qt.point(ex + nx * head, ey + ny * head)
                ]
              }

              width: iconSize
              height: iconSize
              anchors.centerIn: parent
              preferredRendererType: Shape.CurveRenderer

              ShapePath {
                strokeColor: refreshIcon.strokeColor
                strokeWidth: refreshIcon.lineWidth
                fillColor: "transparent"
                capStyle: ShapePath.RoundCap
                PathAngleArc {
                  centerX: refreshIcon.center; centerY: refreshIcon.center
                  radiusX: refreshIcon.radius; radiusY: refreshIcon.radius
                  startAngle: refreshIcon.startA
                  sweepAngle: refreshIcon.sweep
                }
              }

              ShapePath {
                strokeColor: refreshIcon.strokeColor
                strokeWidth: refreshIcon.lineWidth
                fillColor: "transparent"
                capStyle: ShapePath.RoundCap
                PathAngleArc {
                  centerX: refreshIcon.center; centerY: refreshIcon.center
                  radiusX: refreshIcon.radius; radiusY: refreshIcon.radius
                  startAngle: refreshIcon.startA + 180
                  sweepAngle: refreshIcon.sweep
                }
              }

              ShapePath {
                strokeColor: "transparent"
                fillColor: refreshIcon.strokeColor
                PathPolyline { path: refreshIcon.arrowHead(refreshIcon.startA + refreshIcon.sweep) }
              }

              ShapePath {
                strokeColor: "transparent"
                fillColor: refreshIcon.strokeColor
                PathPolyline { path: refreshIcon.arrowHead(refreshIcon.startA + refreshIcon.sweep + 180) }
              }

              RotationAnimation on rotation {
                running: root.refreshing
                loops: Animation.Infinite
                from: 0
                to: 360
                duration: 900
                onRunningChanged: if (!running) refreshIcon.rotation = 0
              }
            }
          }
        }
      }
    }
  }
}
