import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CountiesComponent } from './counties/counties.component';
import { MapComponent } from './map/map.component';

const routes: Routes = [
  { path: '', component: MapComponent },
  { path: 'map', component: MapComponent },
  { path: 'counties', component: CountiesComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
