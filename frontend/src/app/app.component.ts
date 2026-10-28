import { Component, OnInit } from '@angular/core';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface RouteData {
  showTopNav?: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public isLoggedIn: boolean = false;
  public showTopNav: boolean = true;
  public isSidebarCollapsed: boolean = false;
  title = 'GMC ICCC';

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private appService: AppService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isAuthenticated();

    this.appService.sidebarCollapsed$.subscribe((collapsed) => {
      this.isSidebarCollapsed = collapsed;
    });

    // Listen to route changes to dynamically control top nav & auth visibility
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isLoggedIn = this.authService.isAuthenticated();
        const currentRoute = this.getChild(this.activatedRoute);
        currentRoute.data.subscribe((data: RouteData) => {
          this.showTopNav = data.showTopNav !== false;
        });
      });
  }

  private getChild(route: ActivatedRoute): ActivatedRoute {
    if (route.firstChild) {
      return this.getChild(route.firstChild);
    }
    return route;
  }
}
