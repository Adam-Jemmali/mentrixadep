import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import landGeoJson from "@/features/marketing/data/globe-land-110m.json";

/** Bundled Natural Earth 110m land — avoids runtime fetch / middleware issues in production. */
export const GLOBE_LAND_GEOJSON = landGeoJson as FeatureCollection<Geometry, GeoJsonProperties>;
