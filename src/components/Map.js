import React from 'react'
import {
  Map as MapComponent,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  ScaleControl,
  Tooltip,
} from 'react-leaflet'
import Control from 'react-leaflet-control'
import { makeStyles, useTheme } from '@material-ui/core/styles'
import { useMediaQuery } from '@material-ui/core'
import { GpsFixed, GpsNotFixed } from '@material-ui/icons'
import { Icon, DivIcon } from 'leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import 'leaflet/dist/leaflet.css'
import 'react-leaflet-markercluster/dist/styles.min.css'
import ContextMenu from './ContextMenu'
import { getIconUrl } from '../utils/helpers'


const Map = React.forwardRef(({
  updateCoordinates,
  ...props
}, ref) => {
  const [activeMarker, setActiveMarker] = React.useState()
  const [contextMenu, setContextMenu] = React.useState()
  const [previousBounds, setPreviousBounds] = React.useState()
  const mapRef = React.useRef()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isPhone = useMediaQuery(theme.breakpoints.down('xs'))
  const classes = useStyles()

  React.useEffect(() => {
    if (activeMarker && !contextMenu) {
      mapRef.current.leafletElement.panTo(activeMarker)
    }
  }, [activeMarker])

  React.useEffect(() => {
    if (props.center && !activeMarker) {
      mapRef.current.leafletElement.flyTo(props.center)
    }
  }, [props.center])

  React.useEffect(() => {
    if (isMobile) {
      mapRef.current.leafletElement.invalidateSize()
    }
  }, [props.isLocationTabOpen, isMobile])

  // Handle refs.
  React.useImperativeHandle(ref, () => ({
    setActiveMarker(coords) {
      setActiveMarker(coords)
    },
    loadMapMarkers() {
      loadMapMarkers()
    },
  }))

  const loadMapMarkers = async () => {
    const bounds = await mapRef.current.leafletElement.getBounds()
    // Check whether viewport really changed to prevent a multiple calls for the
    // same data.
    if (JSON.stringify(bounds) !== JSON.stringify(previousBounds)) {
      props.loadMapMarkers(bounds)
      props.setStoredPosition(mapRef.current.viewport)
      setPreviousBounds(bounds)
    }
  }

  return (
    <MapComponent
      ref={mapRef}
      className={classes.root}
      style={props.isLocationTabOpen && isMobile
        ? isPhone
          ? { height: theme.layout.mobileMiniMapHeight }
          : { marginLeft: theme.layout.locationTabWidth }
        : {}
      }
      center={props.center}
      zoom={props.zoom}
      minZoom={5}
      maxZoom={18}
      maxBounds={[[-90, -180], [90, 180]]}
      zoomControl={false}
      onMoveEnd={() => loadMapMarkers()}
      onContextMenu={e => {
        if (!props.editMode) {
          if (props.isLoggedIn) {
            setContextMenu(!contextMenu)
            setActiveMarker(contextMenu ? null : e.latlng)
          }
          props.closeTab()
        }
      }}
      onClick={e => {
        if (contextMenu) {
          // If context menu is opened, close it.
          setContextMenu(false)
          setActiveMarker(false)
        } else if (props.editMode && props.isLoggedIn && !activeMarker) {
          // If location creation form has beem opened from URL and there are no
          // coordinates given yet, set the coordinates and active marker.
          setActiveMarker(e.latlng)
          updateCoordinates(e.latlng)
        } else if (isMobile && props.isLocationTabOpen && !props.editMode) {
          // On mobile version, dismiss the location details drawer, when
          // clicking on a mini map.
          props.closeTab()
          setContextMenu(false)
          setActiveMarker(false)
        }
      }}
    >
      <TileLayer
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        attribution={`&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`}
      />
      <MarkerClusterGroup
        showCoverageOnHover={false}
        maxClusterRadius={60}
        disableClusteringAtZoom={11}
        spiderfyOnMaxZoom={false}
        iconCreateFunction={cluster => {
          const count = cluster.getChildCount()
          return new DivIcon({
            html: count,
            className: 'cluster-icon',
            iconSize: [40, 40],
          })
        }}
      >
        {props.points && props.points.map(item => {
          const { location: { lat, lon }, type } = item
          return <Marker
            key={item.id}
            icon={new Icon({
              iconUrl: getIconUrl(type, item.waiting_time),
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })}
            position={[lat, lon]}
            onClick={() => {
              props.openLocationTab(item)
              setContextMenu(null)
              setActiveMarker([lat, lon])
            }}
          >
            <Tooltip>{item.name}<br />{item.phone && `tel. ${item.phone}`}</Tooltip>
          </Marker>
        })}
      </MarkerClusterGroup>
      {activeMarker &&
        <Marker
          icon={new Icon({
            iconUrl: '/location-icons/point.svg',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          })}
          zIndexOffset={1000}
          position={activeMarker}
          draggable={props.editMode}
          onMoveEnd={e => {
            if (props.editMode) {
              updateCoordinates(e.target.getLatLng())
            }
          }}
        />
      }
      {activeMarker && contextMenu && props.isModerator &&
        <Popup
          position={activeMarker}
          closeButton={false}
          className={classes.popup}
        >
          <ContextMenu addMarker={() => {
            setContextMenu(null)
            props.openAddMarkerTab(activeMarker)
            mapRef.current.leafletElement.setView(activeMarker)
          }} />
        </Popup>
      }
      {props.currentLocation &&
        <Marker
          icon={new Icon({
            iconUrl: '/location-icons/current.svg',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })}
          zIndexOffset={1100}
          position={props.currentLocation}
        />
      }
      {(!props.isLocationTabOpen || !isPhone) &&
        <>
          <ZoomControl position='topright' />
          <Control position='topright' className='leaflet-bar'>
            <a
              className={classes.customControl}
              onClick={() => props.currentLocation &&
                mapRef.current.leafletElement.flyTo(props.currentLocation)
              }
              disabled={!props.currentLocation}
            >
              {props.currentLocation
                ? <GpsFixed className={classes.customControlIcon} />
                : <GpsNotFixed className={classes.customControlIcon} />
              }
            </a>
          </Control>
        </>
      }
      <ScaleControl position='bottomright' imperial={false} />
    </MapComponent>
  )
})

Map.defaultProps = {
  zoom: 7,
}

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    '& .leaflet-marker-icon': {
      filter: 'drop-shadow(0 0 1px rgb(0,0,0))',
    },
    '& .cluster-icon': {
      backgroundColor: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      color: theme.palette.primary.main,
      borderRadius: '50%',
      borderColor: theme.palette.primary.main,
      borderWidth: 4,
      borderStyle: 'solid',
      fontSize: 16,
      filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))',
    },
  },
  popup: {
    marginBottom: 50,
    '& .leaflet-popup-content-wrapper': {
      backgroundColor: 'transparent',
      border: 'none',
    },
    '& .leaflet-popup-content': {
      margin: 0,
      borderRadius: 0,
      border: 'none',
    },
  },
  customControl: {
    display: 'flex !important',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    '&[disabled]': {
      pointerEvents: 'none',
      opacity: 0.67,
    },
  },
  customControlIcon: {
    fontSize: 18,
  },
}))

export default Map
