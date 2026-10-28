import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AuthGuardService as AuthGuard } from "./auth/auth-gaurd.service";
import { LoginComponent } from './login/login.component';
import { VehicleMasterComponent } from './vehicle-master/vehicle-master.component';
import { VehicleRoutesComponent } from './vehicle-routes/vehicle-routes.component';
import { OperatorsComponent } from './staff/operators/operators.component';
import { DriversComponent } from './staff/drivers/drivers.component';
import { DailyUpdateFormComponent } from './daily-update-form/daily-update-form.component';
import { BusesComponent } from './buses/buses.component';
import { RouteReplayComponent } from './route-replay/route-replay.component';
import { FuelManagementComponent } from './fuel-management/fuel-management.component';

const routes: Routes = [
  {
    path: "login",
    component: LoginComponent,
    data: { showTopNav: false },
  },
  {
    path: "home",
    component: HomeComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  {
    path: "vehicle-master",
    component: VehicleMasterComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  {
    path: "vehicle-routes",
    component: VehicleRoutesComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  {
    path: "driver",
    component: DriversComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  {
    path: "operators",
    component: OperatorsComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  {
    path: "daily-update",
    component: DailyUpdateFormComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  {
    path: "buses",
    component: BusesComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  {
    path: "route-replay",
    component: RouteReplayComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  {
    path: "fuel-management",
    component: FuelManagementComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  { path: "**", redirectTo: "home" }
];

const config: ExtraOptions = {
  useHash: true
};

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
