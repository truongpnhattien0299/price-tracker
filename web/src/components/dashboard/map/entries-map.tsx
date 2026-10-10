"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Marker, type MapRef, type ViewStateChangeEvent } from "react-map-gl/maplibre"
import Supercluster from "supercluster"

import { BaseMap } from "@/components/shared/map/base-map"
import { PhotoPin } from "@/components/shared/map/pins"
import { usePhotoUrls } from "@/hooks/queries/use-photo-url"
import type { MapPoint } from "@/types/api"

type PointProps = { id: string; photoKey: string | null; t: number }
// Each cluster carries its newest photo as a cover (`at` = -1 when it has none).
type ClusterProps = { cover: string | null; at: number }

// Clusters stop splitting here: points closer than a pin at z17 (~70 m, e.g.
// stalls in one market) stay one cluster even zoomed in, instead of stacking.
const CLUSTER_MAX_ZOOM = 17
// One POST /uploads/photo-urls per view; the API caps a batch at 100 keys.
const MAX_URLS = 100

type View = { bounds: [number, number, number, number]; zoom: number }

function viewOf(map: Pick<MapRef, "getBounds" | "getZoom">): View {
  const b = map.getBounds()
  return { bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom() }
}

/**
 * Photo pins for the entries on the map, clustered client-side with
 * supercluster. Photo URLs are fetched in one batch for what is on screen,
 * refreshed when the map settles — never one request per pin.
 */
export default function EntriesMap({
  points,
  fitKey,
  selectedId,
  onOpen,
  onOpenGroup,
  className,
}: {
  points: MapPoint[]
  /** Changes when the filters change: the map then fits the new points. */
  fitKey: string
  selectedId: string | null
  onOpen: (point: MapPoint) => void
  /** A cluster that cannot split further (same shop, same market). */
  onOpenGroup: (points: MapPoint[]) => void
  className?: string
}) {
  const mapRef = useRef<MapRef>(null)
  const [view, setView] = useState<View | null>(null)

  const byId = useMemo(() => new Map(points.map((p) => [p.id, p])), [points])
  const index = useMemo(() => {
    const sc = new Supercluster<PointProps, ClusterProps>({
      radius: 60,
      maxZoom: CLUSTER_MAX_ZOOM,
      map: (p) => ({ cover: p.photoKey, at: p.photoKey ? p.t : -1 }),
      reduce: (acc, p) => {
        if (p.at > acc.at) {
          acc.cover = p.cover
          acc.at = p.at
        }
      },
    })
    sc.load(
      points.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: { id: p.id, photoKey: p.photoKey, t: Date.parse(p.purchasedAt) },
      })),
    )
    return sc
  }, [points])

  const clusters = useMemo(
    () => (view ? index.getClusters(view.bounds, Math.min(Math.floor(view.zoom), CLUSTER_MAX_ZOOM)) : []),
    [index, view],
  )

  const keys = useMemo(
    () =>
      clusters
        .map((c) => ("cluster" in c.properties && c.properties.cluster ? c.properties.cover : (c.properties as PointProps).photoKey))
        .filter((k): k is string => !!k)
        .slice(0, MAX_URLS),
    [clusters],
  )
  const urls = usePhotoUrls(keys)

  // Fit the points once per filter set; panning afterwards is the user's.
  const fitted = useRef<string | null>(null)
  const fit = useCallback(() => {
    const map = mapRef.current
    if (!map || points.length === 0 || fitted.current === fitKey) return
    // Opened on one entry (`?entry=`, e.g. "Xem trên bản đồ"): start at its pin.
    const target = fitted.current === null && selectedId ? byId.get(selectedId) : undefined
    fitted.current = fitKey
    if (target || points.length === 1) {
      const p = target ?? points[0]!
      map.flyTo({ center: [p.lng, p.lat], zoom: target ? 17 : 15, duration: 800 })
      return
    }
    let [w, s, e, n] = [180, 90, -180, -90]
    for (const p of points) {
      w = Math.min(w, p.lng)
      e = Math.max(e, p.lng)
      s = Math.min(s, p.lat)
      n = Math.max(n, p.lat)
    }
    map.fitBounds([w, s, e, n], { padding: 64, maxZoom: 15, duration: 800 })
    // selectedId only matters on the first fit; later selections must not refit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, points, byId])
  useEffect(fit, [fit])

  const onLoad = useCallback(() => {
    if (mapRef.current) setView(viewOf(mapRef.current))
    fit()
  }, [fit])
  const onMoveEnd = useCallback((e: ViewStateChangeEvent) => setView(viewOf(e.target)), [])

  function openCluster(clusterId: number, lng: number, lat: number) {
    const zoom = index.getClusterExpansionZoom(clusterId)
    if (zoom > CLUSTER_MAX_ZOOM) {
      const leaves = index.getLeaves(clusterId, Infinity)
      onOpenGroup(leaves.map((l) => byId.get(l.properties.id)).filter((p): p is MapPoint => !!p))
      return
    }
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 600 })
  }

  return (
    <BaseMap ref={mapRef} className={className} onLoad={onLoad} onMoveEnd={onMoveEnd}>
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates as [number, number]
        if ("cluster" in c.properties && c.properties.cluster) {
          const { cluster_id, point_count, cover } = c.properties
          return (
            <Marker
              key={`c${cluster_id}`}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              className="hover:z-10"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                openCluster(cluster_id, lng, lat)
              }}
            >
              <PhotoPin
                src={cover ? urls.data?.[cover] : undefined}
                hasPhoto={!!cover}
                failed={urls.isError}
                label={`${point_count} khoản chi`}
                count={point_count}
              />
            </Marker>
          )
        }
        const point = byId.get((c.properties as PointProps).id)
        if (!point) return null
        const selected = point.id === selectedId
        return (
          <Marker
            key={point.id}
            longitude={lng}
            latitude={lat}
            anchor="bottom"
            className="hover:z-10"
            style={selected ? { zIndex: 5 } : undefined}
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              onOpen(point)
            }}
          >
            <PhotoPin
              src={point.photoKey ? urls.data?.[point.photoKey] : undefined}
              hasPhoto={!!point.photoKey}
              failed={urls.isError}
              label={point.productName ?? "Khoản chi"}
              selected={selected}
            />
          </Marker>
        )
      })}
    </BaseMap>
  )
}
