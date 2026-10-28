import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuardService implements CanActivate {
  constructor(public auth: AuthService, public router: Router) {}
  canActivate(): boolean {
    console.log("is Authenticated=", this.auth.isAuthenticated());
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      console.log("ssssssssssssssssss");
      
      return false;
    }
    console.log("aaaaaaaaaaaaaaaaaaaaaa");
    
    return true;
  }
}