import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {
  constructor(public auth: AuthService, public router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    // Role check: 'fuel manager' is restricted exclusively to the fuel management module
    if (this.auth.isFuelManager()) {
      if (!state.url.includes('/fuel-management')) {
        this.router.navigate(['/fuel-management']);
        return false;
      }
    }

    return true;
  }
}