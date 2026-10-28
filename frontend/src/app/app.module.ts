import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { ToastrModule } from 'ngx-toastr';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {AuthService} from './auth/auth.service';
import { AuthGuardService } from './auth/auth-gaurd.service';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CommonModule, DatePipe } from '@angular/common';
import { TovnavComponent } from './components/tovnav/tovnav.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FooterComponent } from './components/footer/footer.component';
import { NgxSpinnerModule } from 'ngx-spinner';
import { VehicleMasterComponent } from './vehicle-master/vehicle-master.component';
import { VehicleRoutesComponent } from './vehicle-routes/vehicle-routes.component';
import { OperatorsComponent } from './staff/operators/operators.component';
import { DriversComponent } from './staff/drivers/drivers.component';
import { DailyUpdateFormComponent } from './daily-update-form/daily-update-form.component';
import { BusesComponent } from './buses/buses.component';
import { RouteReplayComponent } from './route-replay/route-replay.component';
import { FuelManagementComponent } from './fuel-management/fuel-management.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LoginComponent,
    TovnavComponent,
    FooterComponent,
    VehicleMasterComponent,
    VehicleRoutesComponent,
    OperatorsComponent,
    DriversComponent,
    DailyUpdateFormComponent,
    BusesComponent,
    RouteReplayComponent,
    FuelManagementComponent
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    CommonModule,
    HttpClientModule,
    AppRoutingModule,
    MatSlideToggleModule,
    NgxSpinnerModule,
    ToastrModule.forRoot({
      timeOut: 10000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),
    BrowserAnimationsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [AuthService, AuthGuardService, DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
