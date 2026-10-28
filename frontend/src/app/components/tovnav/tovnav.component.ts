import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AppService } from '../../app.service';
import { LoginService } from 'src/app/login/login.service';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tovnav',
  templateUrl: './tovnav.component.html',
  styleUrls: ['./tovnav.component.css'],
  providers: [DatePipe],
})
export class TovnavComponent implements OnInit, OnDestroy {
  public user: any = {};
  public shortName: string = '';
  public userId: any;
  public tokenData: any;
  public menuItems: any[] = [];
  public myDate: string = '';
  public isCollapsed: boolean = false;

  private clockInterval: any;
  private sidebarSub?: Subscription;

  // Search functionality properties
  public searchQuery: string = '';
  public showSuggestions: boolean = false;
  public searchSuggestions: any[] = [];
  public allSearchableItems: any[] = [];

  constructor(
    public appService: AppService,
    private loginService: LoginService,
    private datePipe: DatePipe,
    private router: Router
  ) {
    this.updateClock();
  }

  ngOnInit(): void {
    this.sidebarSub = this.appService.sidebarCollapsed$.subscribe((collapsed) => {
      this.isCollapsed = collapsed;
    });

    this.getUserDetails();
    this.initializeSearchData();

    this.clockInterval = setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (this.sidebarSub) {
      this.sidebarSub.unsubscribe();
    }
  }

  updateClock(): void {
    const now = new Date();
    this.myDate = this.datePipe.transform(now, 'EEEE, dd MMM yyyy • hh:mm:ss a') || '';
  }

  toggleSidebar(): void {
    this.appService.toggleSidebar();
  }


  toggleSubmenu(item: any): void {
    item.isOpen = !item.isOpen;
  }

  getUserDetails = () => {
    try {
      const rawToken = localStorage.getItem('token');
      if (rawToken) {
        let token = JSON.parse(rawToken);
        if (typeof token === 'string') {
          token = JSON.parse(token);
        }
        this.tokenData = token;

        if (token && token['usr']) {
          this.user = token['usr'];
          this.sideMenu(token['usr']);
          this.userId = this.user.id;
          this.shortName = (this.user.f_name || 'GMC').substring(0, 3);
        } else {
          this.sideMenu({ role: 'operator' });
        }
      } else {
        this.sideMenu({ role: 'operator' });
      }
    } catch (e) {
      console.error('Error parsing token:', e);
      this.sideMenu({ role: 'operator' });
    }
  };

  // Initialize searchable data based on menu items and other entities
  initializeSearchData = () => {
    this.allSearchableItems = [];

    if (this.menuItems) {
      this.menuItems.forEach((item: any) => {
        if (item.routerLink) {
          this.allSearchableItems.push({
            type: 'Menu',
            label: item.label,
            icon: item.icon,
            routerLink: item.routerLink,
            keywords: item.label.toLowerCase(),
          });
        }
        if (item.children) {
          item.children.forEach((child: any) => {
            this.allSearchableItems.push({
              type: 'Submenu',
              label: `${item.label} > ${child.label}`,
              icon: child.icon || 'fas fa-chevron-right',
              routerLink: child.routerLink,
              keywords: `${item.label} ${child.label}`.toLowerCase(),
            });
          });
        }
      });
    }

    const additionalItems = [
      {
        type: 'Action',
        label: 'Logout',
        icon: 'fas fa-power-off',
        action: 'logout',
        keywords: 'logout sign out exit',
      },
      {
        type: 'Module',
        label: 'Live Vehicle Tracking',
        icon: 'fas fa-map-marked-alt',
        routerLink: '/home',
        keywords: 'tracking map live gps location vehicles',
      },
      {
        type: 'Module',
        label: 'Vehicle Shift Logsheet',
        icon: 'fas fa-file-invoice',
        routerLink: '/buses',
        keywords: 'shift logsheet daily report trips log',
      },
      {
        type: 'Module',
        label: 'Route Historical Replay',
        icon: 'fas fa-history',
        routerLink: '/route-replay',
        keywords: 'replay history route travel trip replay gps',
      },
      {
        type: 'Module',
        label: 'Vehicle Master Management',
        icon: 'fas fa-bus',
        routerLink: '/vehicle-master',
        keywords: 'vehicle master fleet inventory trucks compactor',
      },
      {
        type: 'Module',
        label: 'Fuel Management & Anti-Theft',
        icon: 'fas fa-gas-pump',
        routerLink: '/fuel-management',
        keywords: 'fuel management diesel petrol theft mileage refuel tank',
      },
    ];

    this.allSearchableItems = [...this.allSearchableItems, ...additionalItems];
  };

  onSearchInput = (event: any) => {
    const query = event.target.value;
    this.searchQuery = query;

    if (query && query.trim().length > 0) {
      this.filterSuggestions(query);
      this.showSuggestions = true;
    } else {
      this.showSuggestions = false;
      this.searchSuggestions = [];
    }
  };

  filterSuggestions = (query: string) => {
    const searchTerm = query.toLowerCase().trim();
    this.searchSuggestions = this.allSearchableItems
      .filter(
        (item) =>
          item.keywords.includes(searchTerm) ||
          item.label.toLowerCase().includes(searchTerm)
      )
      .slice(0, 8);
  };

  onSuggestionClick = (suggestion: any) => {
    if (suggestion.routerLink) {
      this.router.navigate([suggestion.routerLink]);
    } else if (suggestion.action === 'logout') {
      this.signout();
    }
    this.clearSearch();
  };

  clearSearch = () => {
    this.searchQuery = '';
    this.showSuggestions = false;
    this.searchSuggestions = [];
  };

  onSearchBlur = () => {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 250);
  };

  onSearchFocus = () => {
    if (this.searchQuery && this.searchQuery.trim().length > 0) {
      this.filterSuggestions(this.searchQuery);
      this.showSuggestions = true;
    }
  };

  signout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  sideMenu = (user: any) => {
    // Default / Operator role menu
    this.menuItems = [
      {
        label: 'Vehicle Master',
        icon: 'fas fa-bus',
        routerLink: '/vehicle-master',
      },
      {
        label: 'Vehicle Tracking',
        icon: 'fas fa-map-marked-alt',
        routerLink: '/home',
      },
      {
        label: 'Vehicle Logsheet',
        icon: 'fas fa-file-invoice',
        routerLink: '/buses',
      },
      {
        label: 'Vehicle Routes',
        icon: 'fas fa-route',
        routerLink: '/vehicle-routes',
      },
      {
        label: 'Staff Management',
        icon: 'fas fa-users-cog',
        isOpen: false,
        children: [
          {
            label: 'Drivers / Operators',
            routerLink: '/driver',
            icon: 'fas fa-id-card',
          },
          {
            label: 'Supervisors',
            routerLink: '/operators',
            icon: 'fas fa-user-shield',
          },
        ],
      },
      {
        label: 'Route Replay',
        icon: 'fas fa-history',
        routerLink: '/route-replay',
      },
      {
        label: 'Fuel Management',
        icon: 'fas fa-gas-pump',
        routerLink: '/fuel-management',
      },
    ];

    if (user && user.role === 'cashier') {
      this.menuItems = [
        {
          label: 'Dashboard',
          icon: 'fas fa-home',
          routerLink: '/home',
        },
        {
          label: 'Vehicle Master',
          icon: 'fas fa-bus',
          routerLink: '/vehicle-master',
        },
        {
          label: 'Daily Updates',
          icon: 'fas fa-calendar-check',
          routerLink: '/bus-daily-updates',
        },
        {
          label: 'Trips & Logsheet',
          icon: 'fas fa-file-invoice',
          routerLink: '/buses',
        },
        {
          label: 'Route Replay',
          icon: 'fas fa-history',
          routerLink: '/route-replay',
        },
        {
          label: 'Fuel Management',
          icon: 'fas fa-gas-pump',
          routerLink: '/fuel-management',
        },
      ];
    }

    this.initializeSearchData();
  };
}
