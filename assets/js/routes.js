/**
 * Created by Jean on 2019-10-09.
 */

var Routes = {
  init: function () {
    $('#custom-routes').prop('checked', Routes.customRouteEnabled)

    $('#generate-route-use-pathfinder').prop('checked', Routes.usePathfinder)
    $('#generate-route-generate-on-visit').prop('checked', Routes.generateOnVisit)
    $('#generate-route-ignore-collected').prop('checked', Routes.ignoreCollected)
    $('#generate-route-auto-update').prop('checked', Routes.autoUpdatePath)
    $('#generate-route-distance').val(Routes.maxDistance)
    $('#generate-route-start-lat').val(Routes.startMarkerLat)
    $('#generate-route-start-lng').val(Routes.startMarkerLng)

    $('#generate-route-fasttravel-weight').val(Routes.fasttravelWeight)
    $('#generate-route-railroad-weight').val(Routes.railroadWeight)

    // Pathfinder / Generator toggle
    if (Routes.usePathfinder) {
      $('#generate-route-distance').parent().hide()
      $('#generate-route-auto-update').parent().parent().hide()
      $('#generate-route-fasttravel-weight').parent().show()
      $('#generate-route-railroad-weight').parent().show()
    } else {
      $('#generate-route-distance').parent().show()
      $('#generate-route-auto-update').parent().parent().show()
      $('#generate-route-fasttravel-weight').parent().hide()
      $('#generate-route-railroad-weight').parent().hide()
    }

    // Route starts at
    var genPathStart = $.cookie('generator-path-start')
    if (!genPathStart) genPathStart = 'SW'

    $('#generate-route-start').val(genPathStart)

    if (genPathStart != 'Custom') {
      $('#generate-route-start-lat').parent().hide()
      $('#generate-route-start-lng').parent().hide()
    }
  },

  loadCustomRoute: function (input) {
    try {
      var connections = []

      input = input.replace(/\r?\n|\r/g, '').replace(/\s/g, '').split(',')

      $.each(input, function (key, value) {
        var _marker = MapBase.markers.filter(marker => marker.text == value && marker.day == Cycles.data.cycles[Cycles.data.current][marker.category])[0]
        if (_marker == null) {
          console.log(`Item not found on map: '${value}'`)
        } else {
          connections.push([_marker.lat, _marker.lng])
        }
      })

      if (Routes.polylines instanceof L.Polyline) {
        MapBase.map.removeLayer(Routes.polylines)
      }

      Routes.polylines = L.polyline(connections, {
        color: '#9a3033'
      })
      MapBase.map.addLayer(Routes.polylines)
    } catch (e) {
      alert(Language.get('routes.invalid'))
      console.log(e)
    }
  },

  addMarkerOnCustomRoute: function (value) {
    if (Routes.customRouteEnabled) {
      if (Routes.customRouteConnections.includes(value)) {
        Routes.customRouteConnections = Routes.customRouteConnections.filter(function (item) {
          return item !== value
        })
      } else {
        Routes.customRouteConnections.push(value)
      }

      var connections = []

      $.each(Routes.customRouteConnections, function (key, item) {
        var _marker = MapBase.markers.filter(marker => marker.text == item && marker.day == Cycles.data.cycles[Cycles.data.current][marker.category])[0]
        connections.push([_marker.lat, _marker.lng])
      })

      if (Routes.polylines instanceof L.Polyline) {
        MapBase.map.removeLayer(Routes.polylines)
      }

      Routes.polylines = L.polyline(connections, {
        color: '#9a3033'
      })
      MapBase.map.addLayer(Routes.polylines)
    }
  },

  exportCustomRoute: function () {
    setClipboardText(Routes.customRouteConnections.join(','))
    alert(Language.get('routes.exported'))
  },

  importCustomRoute: function () {
    var input = prompt(Language.get('routes.import_prompt'), '')

    if (input == null || input == '') {
      alert(Language.get('routes.empty'))
    } else {
      Routes.loadCustomRoute(input)
    }
  },

  routesData: [],
  polylines: null,

  customRouteEnabled: $.cookie('custom-routes-enabled') == '1',
  customRouteConnections: [],

  /**
   * Path generator by Senexis
   */
  // Whether the route should be generated when the map is loaded.
  generateOnVisit: $.cookie('generator-path-generate-on-visit') == '1',

  // Whether collected items should be ignored or not when pathing.
  ignoreCollected: $.cookie('generator-path-ignore-collected') == '1',

  // Whether to automatically update the path.
  autoUpdatePath: $.cookie('generator-path-auto-update') == '1',

  // The maximum distance a path can be in points.
  // - This number might need to be tweaked depending on how many markers there are.
  // - 25 seems optimal for everything, a higher number is needed for less markers.
  // - If the number is too low, the path will end prematurely.
  // - If the number is too high, undesirable paths might be drawn (across Iron Lake for example).
  maxDistance: parseInt($.cookie('generator-path-distance')) ? parseInt($.cookie('generator-path-distance')) : 25,

  // The point to start the path generator from, default is SW edge.
  startMarkerLat: parseFloat($.cookie('generator-path-start-lat')) ? parseFloat($.cookie('generator-path-start-lat')) : -119.9063,
  startMarkerLng: parseFloat($.cookie('generator-path-start-lng')) ? parseFloat($.cookie('generator-path-start-lng')) : 8.0313,
  startMarker: function () {
    return { lat: Routes.startMarkerLat, lng: Routes.startMarkerLng }
  },

  // Path finder options
  usePathfinder: $.cookie('generator-path-use-pathfinder') == '1',
  allowFasttravel: $.cookie('generator-path-allow-fasttravel') == '1',
  allowRailroad: $.cookie('generator-path-allow-railroad') == '1',
  fasttravelWeight: parseFloat($.cookie('generator-path-fasttravel-weight')) ? parseFloat($.cookie('generator-path-fasttravel-weight')) : ($.cookie('generator-path-allow-fasttravel') == '1' ? 1 : Infinity),
  railroadWeight: parseFloat($.cookie('generator-path-railroad-weight')) ? parseFloat($.cookie('generator-path-railroad-weight')) : ($.cookie('generator-path-allow-railroad') == '1' ? 1 : 2),

  // Needed to keep track of the previously drawn path so we can remove it later.
  lastPolyline: null,

  // Simple utility to get the distance between two markers in Leaflet.
  getDistance: function (marker1, marker2) {
    var latlng1 = L.latLng([marker1.lat, marker1.lng])
    var latlng2 = L.latLng([marker2.lat, marker2.lng])

    return MapBase.map.distance(latlng1, latlng2)
  },

  // Simple utility to check whether the two given markers are the same.
  isSameMarker: function (marker1, marker2) {
    return marker1.lat == marker2.lat && marker1.lng == marker2.lng
  },

  // Simple utility to clear the given polyline from Leaflet.
  clearPath: function (starting) {
    if ((typeof (starting) !== 'boolean' || !starting) && Routes.usePathfinder) {
      PathFinder.routegenClear()
    }

    if (!Routes.lastPolyline) return

    Routes.lastPolyline.remove(MapBase.map)
    Routes.lastPolyline = null
  },

  // Find the nearest neighbor to the given marker.
  // Needs to have an array of the possible markers and currently chosen paths and the maximum distance a path can be.
  nearestNeighborTo: function (marker, possibleNeighbors, polylines, maxDistance) {
    var resDistance = null
    for (var i = 0; i < possibleNeighbors.length; i++) {
      var element = possibleNeighbors[i]

      // Calculate closest path.
      var distance = Routes.getDistance(marker, element)

      // Skip any distance over maxDistance.
      if (maxDistance != -1 && distance > maxDistance) continue

      // Skip the current marker.
      if (Routes.isSameMarker(marker, element)) continue

      // Skip existing paths in polylines.
      var pathExists = false
      var markerNodeCount = 0
      var elementNodeCount = 0

      polylines.forEach((polyline) => {
        // Check if the path is already drawn to prevent looping paths.
        // {element, marker} exists
        if (Routes.isSameMarker(polyline[0], element) && Routes.isSameMarker(polyline[1], marker)) {
          pathExists = true
        }

        // {marker, element} exists
        if (Routes.isSameMarker(polyline[0], marker) && Routes.isSameMarker(polyline[1], element)) {
          pathExists = true
        }

        // Count how many paths the element and marker is in already to prevent more than two path lines from each marker.
        // {element, Any} or {Any, element} exists
        if (Routes.isSameMarker(polyline[0], element) || Routes.isSameMarker(polyline[1], element)) {
          elementNodeCount++
        }

        // {marker, Any} or {Any, marker} exists
        if (Routes.isSameMarker(polyline[0], marker) || Routes.isSameMarker(polyline[1], marker)) {
          markerNodeCount++
        }
      })

      // The path already is present in the path list.
      if (pathExists) continue

      // The current marker already has a path chosen for it.
      if (markerNodeCount > 1) continue

      // We are drawing a one-way path, in other words we can only go to uncharted nodes.
      if (elementNodeCount != 0) continue

      // If resDistance is empty, set it to the first valid marker.
      // If you put this anywhere else, a bug is possible where the first Array item gets chosen incorrectly.
      if (!resDistance) {
        resIndex = i
        resMarker = element
        resDistance = distance
      }

      // If distance is less than previous distance, set the current path as more optimal than the last.
      if (distance < resDistance) {
        resIndex = i
        resMarker = element
        resDistance = distance
      }
    }

    // Return the most optimal path.
    return {
      index: resIndex,
      marker: resMarker,
      distance: resDistance
    }
  },

  // Generate a path using a nearest neighbor algorithm.
  // force: Whether the path should be generated with or without checking the restrictions.
  generatePath: function (force = false) {
    if (!force) {
      // Only run when an update is needed.
      if (Routes.lastPolyline == null) return

      // Only run when the autoUpdatePath option is selected.
      if (!Routes.autoUpdatePath) return
    }

    // Clean up before generating.
    Routes.clearPath(true)

    // Setup variables.
    var newMarkers = MapBase.markers.filter((marker) => { return marker.isVisible })

    // Optionally ignore the already collected markers.
    if (Routes.ignoreCollected) {
      newMarkers = newMarkers.filter((marker) => { return marker.canCollect && !marker.isCollected })
    }

    if (Inventory.isEnabled) {
      newMarkers = newMarkers.filter((marker) => { return marker.amount < Inventory.stackSize })
    }

    var polylines = []

    // The starting point of the path.
    var first = null

    // Grab the nearest marker to the start of the path.
    first = Routes.nearestNeighborTo(Routes.startMarker(), newMarkers, polylines, -1)

    // The last marker from the loop.
    var last = first.marker

    // Use path finder when enabled
    if (Routes.usePathfinder) {
      PathFinder.routegenStart(last, newMarkers, Routes.fasttravelWeight, Routes.railroadWeight)
      return
    }

    // Loop through all markers and pick the nearest neighbor to that marker.
    for (var i = 0; i < newMarkers.length; i++) {
      var current = Routes.nearestNeighborTo(last, newMarkers, polylines, Routes.maxDistance)
      if (!current) break
      current = current.marker

      // A last fallback to not draw paths that are too long.
      if (Routes.getDistance(last, current) < Routes.maxDistance) {
        polylines.push([{ lat: last.lat, lng: last.lng }, { lat: current.lat, lng: current.lng }])
      }

      last = current
    }

    // Draw all paths on the map, and save the instance of the polyline to be able to clean it up later.
    Routes.lastPolyline = L.polyline(polylines).addTo(MapBase.map)
  }
}

$('#generate-route-generate-on-visit').on('change', function () {
  Routes.runOnStart = $('#generate-route-generate-on-visit').prop('checked')
  $.cookie('generator-path-generate-on-visit', Routes.runOnStart ? '1' : '0', { expires: 999 })
})

$('#generate-route-ignore-collected').on('change', function () {
  Routes.ignoreCollected = $('#generate-route-ignore-collected').prop('checked')
  $.cookie('generator-path-ignore-collected', Routes.ignoreCollected ? '1' : '0', { expires: 999 })

  Routes.generatePath()
})

$('#generate-route-auto-update').on('change', function () {
  Routes.autoUpdatePath = $('#generate-route-auto-update').prop('checked')
  $.cookie('generator-path-auto-update', Routes.autoUpdatePath ? '1' : '0', { expires: 999 })
})

$('#generate-route-distance').on('change', function () {
  var inputValue = parseInt($('#generate-route-distance').val())
  inputValue = !isNaN(inputValue) && inputValue > 0 ? inputValue : 25
  $.cookie('generator-path-distance', inputValue, { expires: 999 })
  Routes.maxDistance = inputValue

  Routes.generatePath()
})

$('#generate-route-start').on('change', function () {
  var inputValue = $('#generate-route-start').val()
  $.cookie('generator-path-start', inputValue, { expires: 999 })

  var startLat = null
  var startLng = null

  $('#generate-route-start-lat').parent().hide()
  $('#generate-route-start-lng').parent().hide()

  switch (inputValue) {
    case 'Custom':
      $('#generate-route-start-lat').parent().show()
      $('#generate-route-start-lng').parent().show()
      return

    case 'N':
      startLat = -11.875
      startLng = 86.875
      break

    case 'NE':
      startLat = -27.4375
      startLng = 161.2813
      break

    case 'SE':
      startLat = -100.75
      startLng = 131.125
      break

    case 'SW':
    default:
      startLat = -119.9063
      startLng = 8.0313
      break
  }

  $('#generate-route-start-lat').val(startLat)
  $('#generate-route-start-lng').val(startLng)

  $.cookie('generator-path-start-lat', startLat, { expires: 999 })
  $.cookie('generator-path-start-lng', startLng, { expires: 999 })

  Routes.startMarkerLat = startLat
  Routes.startMarkerLng = startLng

  Routes.generatePath()
})

$('#generate-route-start-lat').on('change', function () {
  var inputValue = parseFloat($('#generate-route-start-lat').val())
  inputValue = !isNaN(inputValue) ? inputValue : -119.9063
  $.cookie('generator-path-start-lat', inputValue, { expires: 999 })
  Routes.startMarkerLat = inputValue

  Routes.generatePath()
})

$('#generate-route-start-lng').on('change', function () {
  var inputValue = parseFloat($('#generate-route-start-lng').val())
  inputValue = !isNaN(inputValue) ? inputValue : 8.0313
  $.cookie('generator-path-start-lng', inputValue, { expires: 999 })
  Routes.startMarkerLng = inputValue

  Routes.generatePath()
})

$('#generate-route-use-pathfinder').on('change', function () {
  Routes.usePathfinder = $('#generate-route-use-pathfinder').prop('checked')
  $.cookie('generator-path-use-pathfinder', Routes.usePathfinder ? '1' : '0', { expires: 999 })

  // Hide incompatible options.
  if (Routes.usePathfinder) {
    $('#generate-route-distance').parent().hide()
    $('#generate-route-auto-update').parent().parent().hide()
    $('#generate-route-fasttravel-weight').parent().show()
    $('#generate-route-railroad-weight').parent().show()
  } else {
    $('#generate-route-distance').parent().show()
    $('#generate-route-auto-update').parent().parent().show()
    $('#generate-route-fasttravel-weight').parent().hide()
    $('#generate-route-railroad-weight').parent().hide()
  }

  // Prevent both routes being stuck on screen.
  Routes.clearPath()

  Routes.generatePath()
})

$('#generate-route-fasttravel-weight').on('change', function () {
  Routes.fasttravelWeight = parseFloat($('#generate-route-fasttravel-weight').val())
  $.cookie('generator-path-fasttravel-weight', Routes.fasttravelWeight.toString(), { expires: 999 })

  Routes.generatePath()
})

$('#generate-route-railroad-weight').on('change', function () {
  Routes.railroadWeight = parseFloat($('#generate-route-railroad-weight').val())
  $.cookie('generator-path-railroad-weight', Routes.railroadWeight.toString(), { expires: 999 })

  Routes.generatePath()
})
