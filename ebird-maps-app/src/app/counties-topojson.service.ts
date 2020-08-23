import { Injectable } from '@angular/core';

export interface TopoJSON {
  type: 'Topology' | GeoJSON.GeoJsonGeometryTypes | null;
  bbox?: GeoJSON.BBox;
}

export interface Topology<
  T extends Objects<GeoJSON.GeoJsonProperties> = Objects<
    GeoJSON.GeoJsonProperties
  >
> extends TopoJSON {
  type: 'Topology';
  objects: T;
  arcs: number[][][];
}

export interface Objects<P extends GeoJSON.GeoJsonProperties = {}> {
  [key: string]: GeometryObject<P>;
}

export interface GeometryObjectA<P extends GeoJSON.GeoJsonProperties = {}>
  extends TopoJSON {
  type: GeoJSON.GeoJsonGeometryTypes | null;
  id?: number | string;
  properties?: P;
}

export type GeometryObject<
  P extends GeoJSON.GeoJsonProperties = {}
> = GeometryCollection<P>;

export interface GeometryCollection<P extends GeoJSON.GeoJsonProperties = {}>
  extends GeometryObjectA<P> {
  type: 'GeometryCollection';
  geometries: Array<GeometryObject<P>>;
}

// Specific types for this county map.

export interface CountiesData extends Objects<GeoJSON.GeoJsonProperties> {
  counties: GeometryCollection<GeometryObject<GeoJSON.GeoJsonProperties>>;
}

@Injectable({
  providedIn: 'root',
})
export class CountiesTopojsonService {
  private usCounties: Topology<CountiesData>;

  constructor() {
    this.usCounties = require('../../node_modules/us-atlas/counties-albers-10m.json');
  }

  getUsCountiesTopojson() {
    return this.usCounties;
  }
}
