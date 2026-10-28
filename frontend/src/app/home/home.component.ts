import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { HomeService } from './home.service';
import { VehicleService } from '../vehicle.service';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';

interface TrackedMarker extends L.Marker {
  _currentAngle?: number;
  _targetAngle?: number;
  _targetPos?: L.LatLng;
  _speedKmh?: number;
  _isMoving?: boolean;
  _status?: 'moving' | 'stopped' | 'offline';
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapWrapper') mapWrapperRef!: ElementRef;

  map!: L.Map;
  markers: Record<string, TrackedMarker> = {};
  dbVehiclesMap: Map<string, any> = new Map();
  loading: boolean = true;
  isFullscreen: boolean = false;
  activeLayer: 'streets' | 'satellite' = 'streets';
  private streetLayer!: L.TileLayer;
  private satelliteLayer!: L.TileLayer;
  private animationLoopId: number | null = null;

  // Search & Fleet Filter State
  searchQuery: string = '';
  showSearchResults: boolean = false;
  statusFilter: 'all' | 'moving' | 'stopped' = 'all';
  isDrawerOpen: boolean = false;
  highlightedVehicleId: string | null = null;
  fleetList: any[] = [];
  filteredVehicles: any[] = [];
  totalCount: number = 0;
  movingCount: number = 0;
  stoppedCount: number = 0;

  constructor(
    private homeService: HomeService,
    private vehicleService: VehicleService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadDbVehicles();

    // Global hook for popup action buttons
    (window as any).focusVehicle = (id: string) => {
      const veh = this.fleetList.find((v) => v.BoxId === id);
      if (veh) {
        this.selectAndFocusVehicle(veh);
      } else {
        const marker = this.markers[id];
        if (marker && this.map) {
          this.map.flyTo(marker.getLatLng(), 16, { duration: 1.2 });
          marker.openPopup();
        }
      }
    };
  }

  loadDbVehicles(): void {
    this.http.get<any[]>(`${environment.BASE_URL}/api/getVehicleMaster`).subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          data.forEach((v: any) => {
            if (v.vehicle_no) {
              this.dbVehiclesMap.set(String(v.vehicle_no).trim().toUpperCase(), v);
            }
            if (v.box_id) {
              this.dbVehiclesMap.set(String(v.box_id).trim(), v);
            }
          });
          // If vehicles are already loaded on the map, update popup contents & search
          if (this.homeService.lastFleetData && this.homeService.lastFleetData.length > 0) {
            this.updateVehicles(this.homeService.lastFleetData);
          }
        }
      },
      error: (err) => {
        console.error('Error fetching vehicle master data for map popup:', err);
      }
    });
  }

  ngAfterViewInit(): void {
    // 1. Initialize Map
    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([26.1445, 91.7362], 12);

    // 2. OpenStreetMap & Satellite Tile Layers
    this.streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    });

    this.satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );

    this.streetLayer.addTo(this.map);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);

    // 3. Start 60fps smooth movement engine
    this.startContinuousEngine();

    // 4. Instant restoration from service cache if returning from another page
    if (this.homeService.lastFleetData && this.homeService.lastFleetData.length > 0) {
      this.loading = false;
      this.updateVehicles(this.homeService.lastFleetData);
    }

    // 5. Data stream listener
    this.vehicleService.onVehicleUpdate((data: any[]) => {
      if (this.loading && data && data.length > 0) {
        this.loading = false;
      }
      this.homeService.lastFleetData = data || [];
      this.updateVehicles(data || []);
    });
  }

  // ⭐ Switch Map Layer (Streets / Satellite)
  switchLayer(type: 'streets' | 'satellite'): void {
    this.activeLayer = type;
    if (type === 'satellite') {
      this.map.removeLayer(this.streetLayer);
      this.satelliteLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.satelliteLayer);
      this.streetLayer.addTo(this.map);
    }
  }

  // ⭐ Toggle Native Fullscreen Mode
  toggleFullscreen(): void {
    const elem = this.mapWrapperRef ? this.mapWrapperRef.nativeElement : document.documentElement;

    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }

  // ⭐ Recalculate Leaflet map dimensions on fullscreen enter/exit
  @HostListener('document:fullscreenchange', ['$event'])
  @HostListener('document:webkitfullscreenchange', ['$event'])
  @HostListener('document:mozfullscreenchange', ['$event'])
  @HostListener('document:MSFullscreenChange', ['$event'])
  onFullscreenChange(): void {
    this.isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 250);
  }

  // ⭐ Modern Vector Vehicle Puck (Top-down delivery/transit puck with live radar rings & headlights)
  createVehicleDivIcon(status: 'moving' | 'stopped' | 'offline', isMoving: boolean, isHighlighted: boolean = false): L.DivIcon {
    const colorPrimary = isMoving ? '#10b981' : (status === 'stopped' ? '#f59e0b' : '#64748b');
    const colorSecondary = isMoving ? '#047857' : (status === 'stopped' ? '#b45309' : '#334155');
    const gradientId = `grad-${status}-${isMoving ? 'mov' : 'stp'}`;

    const html = `
      <div class="pro-moving-puck-container status-${status} ${isMoving ? 'is-moving' : 'is-idle'} ${isHighlighted ? 'is-search-highlighted' : ''}">
        ${isHighlighted ? '<div class="search-highlight-beacon"></div>' : ''}
        ${isMoving ? `
          <div class="swiggy-headlight-cone"></div>
          <div class="swiggy-radar-ring swiggy-radar-ring-1"></div>
          <div class="swiggy-radar-ring swiggy-radar-ring-2"></div>
        ` : `
          <div class="swiggy-idle-ring"></div>
        `}
        <div class="vehicle-svg-puck">
          <svg viewBox="0 0 30 30" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="puck-shadow-${status}" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#0f172a" flood-opacity="0.45"/>
              </filter>
              <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${colorPrimary}"/>
                <stop offset="100%" stop-color="${colorSecondary}"/>
              </linearGradient>
              <linearGradient id="puck-windshield" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#38bdf8"/>
                <stop offset="100%" stop-color="#0284c7"/>
              </linearGradient>
            </defs>

            <!-- Side Mirrors -->
            <rect x="6.5" y="9" width="2" height="3.5" rx="1" fill="#1e293b"/>
            <rect x="21.5" y="9" width="2" height="3.5" rx="1" fill="#1e293b"/>

            <!-- Chassis Body -->
            <rect x="8.5" y="4" width="13" height="22" rx="4.5" fill="url(#${gradientId})" stroke="#ffffff" stroke-width="1.3" filter="url(#puck-shadow-${status})"/>

            <!-- Front Headlight LED Bulbs -->
            <ellipse cx="11" cy="5.2" rx="1.2" ry="0.8" fill="#fef08a"/>
            <ellipse cx="19" cy="5.2" rx="1.2" ry="0.8" fill="#fef08a"/>

            <!-- Front Windshield -->
            <path d="M 10 9 Q 15 7.8 20 9 L 19.4 12.5 Q 15 11.8 10.6 12.5 Z" fill="url(#puck-windshield)"/>

            <!-- Forward Direction Chevron -->
            <path d="M 15 14.5 L 18 19 L 16 18.3 L 16 21.5 L 14 21.5 L 14 18.3 L 12 19 Z" fill="#ffffff" opacity="0.95"/>

            <!-- Rear Safety Lamps -->
            <rect x="10" y="24.8" width="2.2" height="1" rx="0.5" fill="#ef4444"/>
            <rect x="17.8" y="24.8" width="2.2" height="1" rx="0.5" fill="#ef4444"/>
          </svg>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'pro-vehicle-marker-div',
      html: html,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -18]
    });
  }

  // ⭐ Floating Zomato/Swiggy-Style Status Pill Tooltip (Remains horizontal and legible)
  getTooltipContent(vehicle: any, isMoving: boolean, speedKmh: number): string {
    const name = (vehicle.VehName || ('#' + vehicle.BoxId)).trim();
    const speedDisplay = Math.round(speedKmh);
    return `
      <div class="swiggy-fleet-pill ${isMoving ? 'pill-moving' : 'pill-stopped'}">
        <span class="live-dot"></span>
        <span class="pill-veh-name">${name}</span>
        ${speedDisplay > 0 ? `<span class="pill-speed-badge">${speedDisplay} <span class="unit">km/h</span></span>` : ''}
      </div>
    `;
  }

  // ⭐ Professional Fleet Tracking Card Popup
  getPopupContent(vehicle: any, isMoving: boolean, speedKmh: number): string {
    const id = String(vehicle.BoxId);
    const name = (vehicle.VehName || ('Vehicle #' + id)).trim();
    const status = vehicle.VehicleStatus || (isMoving ? 'Moving' : 'Stopped');
    const speedDisplay = Math.round(speedKmh);
    const location = vehicle.Location || 'Guwahati Region';
    const timestamp = vehicle.DateTime || vehicle.UpdatedTime || 'Live Telemetry';
    const ignition = vehicle.Ignition || (isMoving ? 'ON' : (speedKmh > 0 ? 'ON' : 'OFF'));

    // Driver name & contact number from DB mapping or telematics
    const vehKey = name.toUpperCase();
    const dbVehicle = this.dbVehiclesMap.get(vehKey) || this.dbVehiclesMap.get(id);

    const driverName = (
      dbVehicle?.driver?.driver_name ||
      (vehicle.DriverName && vehicle.DriverName !== 'NA' ? vehicle.DriverName : '') ||
      vehicle.driver_name ||
      'Not Assigned'
    );

    const driverContact = (
      dbVehicle?.driver?.contact_no ||
      vehicle.DriverContact ||
      vehicle.driver_contact ||
      vehicle.driver_contact_no ||
      vehicle.contact_no ||
      ''
    );

    return `
      <div class="swiggy-fleet-popup">
        <div class="popup-header-row">
          <div class="header-icon-box ${isMoving ? 'is-moving' : 'is-stopped'}">
            <i class="fa fa-truck-moving"></i>
          </div>
          <div class="header-text-box">
            <div class="popup-reg-no">${name}</div>
            <div class="popup-sub-tag">Device #${id}</div>
          </div>
          <div class="live-pill-badge ${isMoving ? 'pill-moving' : 'pill-stopped'}">
            <span class="pulse-dot"></span>
            <span>${isMoving ? 'In Transit' : status}</span>
          </div>
        </div>

        <div class="popup-metrics-grid">
          <div class="metric-item">
            <span class="metric-lbl">CURRENT SPEED</span>
            <span class="metric-num ${speedDisplay > 0 ? 'text-success' : 'text-muted'}">
              <b>${speedDisplay}</b> <small>km/h</small>
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-lbl">IGNITION</span>
            <span class="metric-num ${ignition === 'ON' ? 'text-success' : 'text-secondary'}">
              <b>${ignition}</b>
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-lbl">STATUS</span>
            <span class="metric-num"><b>${status}</b></span>
          </div>
        </div>

        <div class="popup-info-rows">
          <div class="info-line">
            <i class="fa fa-id-card text-info"></i>
            <div class="info-content">
              <span class="info-sub">Driver</span>
              <span class="info-val">${driverName}</span>
            </div>
          </div>
          <div class="info-line">
            <i class="fa fa-phone-alt text-success"></i>
            <div class="info-content">
              <span class="info-sub">Driver Contact</span>
              <span class="info-val">
                ${driverContact ? `
                  <a href="tel:${driverContact}" class="driver-call-link" style="color: #059669; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fas fa-phone-volume" style="font-size: 10px;"></i>
                    <span>${driverContact}</span>
                  </a>
                ` : `
                  <span class="text-muted" style="font-weight: 500;">Not Available</span>
                `}
              </span>
            </div>
          </div>
          <div class="info-line">
            <i class="fa fa-map-marker-alt text-danger"></i>
            <div class="info-content">
              <span class="info-sub">Location</span>
              <span class="info-val">${location}</span>
            </div>
          </div>
          <div class="info-line">
            <i class="fa fa-clock text-primary"></i>
            <div class="info-content">
              <span class="info-sub">Last Signal</span>
              <span class="info-val">${timestamp}</span>
            </div>
          </div>
        </div>

        <div class="popup-actions-row">
          <button type="button" class="btn-popup-action btn-center" onclick="window.focusVehicle('${id}')">
            <i class="fa fa-crosshairs"></i> Focus
          </button>
          <a class="btn-popup-action btn-replay" href="/route-replay?veh=${id}">
            <i class="fa fa-history"></i> Replay Route
          </a>
        </div>
      </div>
    `;
  }

  updateVehicles(data: any[]): void {
    // 1. Maintain enriched fleetList for searching, checking and filtering
    this.fleetList = (data || [])
      .filter((v) => v.Latitude && v.Longitude && v.BoxId)
      .map((v) => {
        const boxId = String(v.BoxId || '');
        const vehName = String(v.VehName || ('Vehicle #' + boxId)).trim();
        const speed = Number(v.Speed) || 0;
        const isMoving = v.VehicleStatus === 'Moving' && speed > 3;
        const dbMatch = this.dbVehiclesMap.get(vehName.toUpperCase()) || this.dbVehiclesMap.get(boxId);
        const driverName = dbMatch?.driver?.driver_name || (v.DriverName !== 'NA' ? v.DriverName : '') || v.driver_name || 'Not Assigned';
        const driverContact = dbMatch?.driver?.contact_no || v.DriverContact || v.driver_contact || v.contact_no || '';

        return {
          ...v,
          BoxId: boxId,
          VehName: vehName,
          Speed: speed,
          isMoving,
          driverName,
          driverContact,
          division: dbMatch?.division || '',
          vehicleType: dbMatch?.vehicle_type || ''
        };
      });

    this.updateStats();
    this.filterVehicles();

    data.forEach((vehicle) => {
      if (!vehicle.Latitude || !vehicle.Longitude || !vehicle.BoxId) return;

      const lat = Number(vehicle.Latitude);
      const lng = Number(vehicle.Longitude);
      const id = String(vehicle.BoxId);
      const speedKmh = Number(vehicle.Speed) || 0;
      const isMoving = vehicle.VehicleStatus === 'Moving' && speedKmh > 3;

      let status: 'moving' | 'stopped' | 'offline' = 'stopped';
      if (isMoving) {
        status = 'moving';
      } else if (vehicle.VehicleStatus === 'Unreachable' || vehicle.VehicleStatus === 'Offline') {
        status = 'offline';
      } else {
        status = 'stopped';
      }

      const tooltipContent = this.getTooltipContent(vehicle, isMoving, speedKmh);
      const popupContent = this.getPopupContent(vehicle, isMoving, speedKmh);
      const isHighlighted = this.highlightedVehicleId === id;

      if (this.markers[id]) {
        const marker = this.markers[id];

        // Update icon only if motion status, health, or highlight changed
        if (marker._isMoving !== isMoving || marker._status !== status || isHighlighted) {
          marker.setIcon(this.createVehicleDivIcon(status, isMoving, isHighlighted));
        }

        // Keep horizontal tooltip and popup content synchronized
        marker.setTooltipContent(tooltipContent);
        marker.getPopup()?.setContent(popupContent);

        const curPos = marker.getLatLng();
        const newPos = L.latLng(lat, lng);
        const distanceMeters = curPos.distanceTo(newPos);

        // Smooth bearing calculation when vehicle covers >= 5 meters
        if (isMoving && distanceMeters >= 5) {
          const bearing = this.getBearing(curPos, newPos);
          marker._targetAngle = bearing;
          this.homeService.setVehicleCache(id, lat, lng, bearing);
        }

        marker._targetPos = newPos;
        marker._speedKmh = speedKmh;
        marker._isMoving = isMoving;
        marker._status = status;
      } else {
        // Read cached angle so the marker instantly faces the correct route orientation
        const cached = this.homeService.getVehicleCache(id);
        let initialAngle = 0;

        if (cached) {
          initialAngle = cached.angle;
          const prevPos = L.latLng(cached.lat, cached.lng);
          const currentPos = L.latLng(lat, lng);
          if (prevPos.distanceTo(currentPos) >= 5) {
            initialAngle = this.getBearing(prevPos, currentPos);
          }
        }

        const marker = L.marker([lat, lng], {
          icon: this.createVehicleDivIcon(status, isMoving, isHighlighted),
          rotationAngle: initialAngle,
          rotationOrigin: 'center'
        } as any) as TrackedMarker;

        // Show vehicle info tag only on hover (keeps map completely clean)
        marker.bindTooltip(tooltipContent, {
          permanent: false,
          direction: 'top',
          offset: [0, -16],
          className: 'swiggy-leaflet-tooltip'
        });

        // Rich interactive modal card
        marker.bindPopup(popupContent, {
          className: 'swiggy-popup-wrapper',
          maxWidth: 320,
          minWidth: 280
        });

        marker._currentAngle = initialAngle;
        marker._targetAngle = initialAngle;
        marker._targetPos = L.latLng(lat, lng);
        marker._speedKmh = speedKmh;
        marker._isMoving = isMoving;
        marker._status = status;

        marker.addTo(this.map);
        this.markers[id] = marker;
        this.homeService.setVehicleCache(id, lat, lng, initialAngle);
      }
    });
  }

  // ⭐ Vehicle Fleet Statistics Calculation
  updateStats(): void {
    this.totalCount = this.fleetList.length;
    this.movingCount = this.fleetList.filter((v) => v.isMoving).length;
    this.stoppedCount = this.fleetList.filter((v) => !v.isMoving).length;
  }

  // ⭐ Filter vehicles according to search input and status tabs
  filterVehicles(): void {
    let list = this.fleetList;

    if (this.statusFilter === 'moving') {
      list = list.filter((v) => v.isMoving);
    } else if (this.statusFilter === 'stopped') {
      list = list.filter((v) => !v.isMoving);
    }

    if (this.searchQuery && this.searchQuery.trim().length > 0) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter((v) => {
        const vehName = (v.VehName || '').toLowerCase();
        const boxId = (v.BoxId || '').toLowerCase();
        const driver = (v.driverName || '').toLowerCase();
        const contact = (v.driverContact || '').toLowerCase();
        const loc = (v.Location || '').toLowerCase();
        return (
          vehName.includes(q) ||
          boxId.includes(q) ||
          driver.includes(q) ||
          contact.includes(q) ||
          loc.includes(q)
        );
      });
    }

    this.filteredVehicles = list;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && !target.closest('.map-search-center-wrap')) {
      this.showSearchResults = false;
    }
  }

  onSearchChange(): void {
    this.showSearchResults = true;
    this.filterVehicles();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.showSearchResults = false;
    this.filterVehicles();
  }

  setStatusFilter(filter: 'all' | 'moving' | 'stopped'): void {
    this.statusFilter = this.statusFilter === filter ? 'all' : filter;
    this.filterVehicles();
  }

  toggleFleetDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
    if (this.isDrawerOpen) {
      this.filterVehicles();
    }
  }

  closeFleetDrawer(): void {
    this.isDrawerOpen = false;
  }

  // ⭐ Focus and highlight specific vehicle on the map
  selectAndFocusVehicle(vehicle: any): void {
    if (!vehicle || !vehicle.BoxId) return;

    const id = String(vehicle.BoxId);
    this.showSearchResults = false;
    this.searchQuery = vehicle.VehName || ('Vehicle #' + id);
    if (window.innerWidth < 768) {
      this.isDrawerOpen = false;
    }

    const marker = this.markers[id];
    if (marker && this.map) {
      const latLng = marker.getLatLng();
      const speed = Number(vehicle.Speed) || 0;
      const isMoving = vehicle.VehicleStatus === 'Moving' && speed > 3;
      let status: 'moving' | 'stopped' | 'offline' = 'stopped';
      if (isMoving) status = 'moving';
      else if (vehicle.VehicleStatus === 'Unreachable' || vehicle.VehicleStatus === 'Offline') status = 'offline';

      this.highlightedVehicleId = id;
      marker.setIcon(this.createVehicleDivIcon(status, isMoving, true));

      this.map.flyTo(latLng, 16, {
        animate: true,
        duration: 1.2
      });

      setTimeout(() => {
        marker.openPopup();
      }, 500);

      // Reset highlight beacon after 7 seconds
      setTimeout(() => {
        if (this.highlightedVehicleId === id) {
          this.highlightedVehicleId = null;
          if (this.markers[id]) {
            this.markers[id].setIcon(this.createVehicleDivIcon(status, isMoving, false));
          }
        }
      }, 7000);
    } else if (vehicle.Latitude && vehicle.Longitude && this.map) {
      this.map.flyTo([Number(vehicle.Latitude), Number(vehicle.Longitude)], 16, {
        animate: true,
        duration: 1.2
      });
    }
  }

  // ⭐ Fit all fleet markers in viewport
  fitAllVehicles(): void {
    const latLngs: L.LatLng[] = [];
    Object.values(this.markers).forEach((m) => {
      latLngs.push(m.getLatLng());
    });
    if (latLngs.length > 0 && this.map) {
      const bounds = L.latLngBounds(latLngs);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }

  // ⭐ Continuous 60fps Interpolation Engine (Fluid gliding & heading rotation)
  startContinuousEngine(): void {
    const loop = () => {
      Object.values(this.markers).forEach((marker) => {
        if (!marker._isMoving || !marker._targetPos) return;

        const cur = marker.getLatLng();
        const target = marker._targetPos;

        // Smoothly rotate toward heading
        if (typeof marker._targetAngle === 'number') {
          marker._currentAngle = this.interpolateAngle(
            marker._currentAngle ?? 0,
            marker._targetAngle,
            0.1
          );
          (marker as any).setRotationAngle(marker._currentAngle);
        }

        // Smooth position glide (Lerp)
        const dLat = target.lat - cur.lat;
        const dLng = target.lng - cur.lng;
        const dist = Math.hypot(dLat, dLng);

        if (dist > 0.000005) {
          marker.setLatLng([
            cur.lat + dLat * 0.1,
            cur.lng + dLng * 0.1
          ]);
        } else if (dist > 0) {
          marker.setLatLng(target);
        }
      });

      this.animationLoopId = requestAnimationFrame(loop);
    };

    this.animationLoopId = requestAnimationFrame(loop);
  }

  getBearing(start: L.LatLng, end: L.LatLng): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const lat1 = toRad(start.lat);
    const lon1 = toRad(start.lng);
    const lat2 = toRad(end.lat);
    const lon2 = toRad(end.lng);

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  interpolateAngle(start: number, end: number, factor: number): number {
    let diff = (end - start) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;

    if (Math.abs(diff) < 0.5) return end;
    return (start + diff * factor + 360) % 360;
  }

  ngOnDestroy(): void {
    if (this.animationLoopId) {
      cancelAnimationFrame(this.animationLoopId);
    }
    if ((window as any).focusVehicle) {
      delete (window as any).focusVehicle;
    }
  }
}