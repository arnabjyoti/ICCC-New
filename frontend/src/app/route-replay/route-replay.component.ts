import { Component, OnInit, OnDestroy, AfterViewInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { RouteReplayService } from './route-replay.service';
import { VehicleService } from '../vehicle.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';

interface HistoricalPoint {
  BoxId?: string;
  VehName?: string;
  Latitude: string | number;
  Longitude: string | number;
  Speed?: number;
  VehicleStatus?: string;
  Location?: string;
  Lastdate?: string;
}

@Component({
  selector: 'app-route-replay',
  templateUrl: './route-replay.component.html',
  styleUrls: ['./route-replay.component.css']
})
export class RouteReplayComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;
  map!: L.Map;
  loading: boolean = false;
  loadingText: string = 'Loading...';
  showLegend: boolean = false;
  isFullscreen: boolean = false;

  // Tile layers
  activeLayer: 'streets' | 'satellite' = 'streets';
  private streetLayer!: L.TileLayer;
  private satelliteLayer!: L.TileLayer;

  // Filter Models
  vehicleList: any[] = [];
  selectedBoxId: string = '';
  selectedDate: string = new Date().toISOString().split('T')[0];

  // Raw & Snapped Coordinates
  rawCoordinates: HistoricalPoint[] = [];
  snappedPoints: L.LatLng[] = [];
  currentIndex: number = 0;

  // Animation States
  isPlaying: boolean = false;
  playbackMultiplier: number = 1;
  followVehicle: boolean = true;
  activePoint: HistoricalPoint | null = null;
  private animFrameId: number | null = null;
  private lastAnimTime: number = 0;

  // Map Overlays
  private fullRouteLine: L.Polyline | null = null;
  private coveredRouteLine: L.Polyline | null = null;
  private playbackMarker: any = null;
  private startMarker: L.Marker | null = null;
  private endMarker: L.Marker | null = null;

  constructor(
    private routeReplayService: RouteReplayService,
    private vehicleService: VehicleService,
    private http: HttpClient,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Read route parameter if navigated directly from home popup
    this.route.queryParams.subscribe(params => {
      if (params['veh']) {
        this.selectedBoxId = String(params['veh']);
        setTimeout(() => {
          if (this.selectedBoxId) {
            this.loadRouteHistory();
          }
        }, 500);
      }
    });
  }

  ngAfterViewInit(): void {
    // 1. Initialize Map
    this.map = L.map('replay-map', {
      zoomControl: true,
      attributionControl: false
    }).setView([26.1445, 91.7362], 13);

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
    }, 250);

    // 2. Fetch vehicles, sort A-Z, and maintain sticky selection
    this.vehicleService.onVehicleUpdate((data: any[]) => {
      if (data && data.length > 0) {
        const sortedData = [...data].sort((a, b) => {
          const nameA = (a.VehName || '').trim().toUpperCase();
          const nameB = (b.VehName || '').trim().toUpperCase();
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // Populate dropdown once on boot to prevent resetting selected item
        if (this.vehicleList.length === 0) {
          this.vehicleList = sortedData;
          if (!this.selectedBoxId && this.vehicleList.length > 0) {
            this.selectedBoxId = this.vehicleList[0].BoxId;
          }
        } else if (this.vehicleList.length !== sortedData.length) {
          this.vehicleList = sortedData;
        }
      }
    });
  }

  trackByVehicle(index: number, item: any): string {
    return item.BoxId;
  }

  toggleLegend(): void {
    this.showLegend = !this.showLegend;
  }

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

  toggleFullscreen(): void {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
      const elem = this.mapContainerRef ? this.mapContainerRef.nativeElement : document.documentElement;
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

  onRouteChange(): void {
    this.pause();
    this.clearMapLayers();
    this.rawCoordinates = [];
    this.snappedPoints = [];
    this.currentIndex = 0;
    this.activePoint = null;
  }

  loadRouteHistory(): void {
    if (!this.selectedBoxId) {
      this.toastr.warning('Please select a vehicle to load route history.', 'Vehicle Required');
      return;
    }

    this.loading = true;
    this.loadingText = 'Fetching route history telemetry...';
    this.onRouteChange();

    this.routeReplayService.getTravelHistory(this.selectedBoxId, this.selectedDate, (err: any, response: any) => {
      if (err) {
        this.loading = false;
        console.error('Failed to fetch route history:', err);
        return;
      }

      let historyData: HistoricalPoint[] = [];

      if (Array.isArray(response)) {
        historyData = response;
      } else if (response && Array.isArray(response.data)) {
        historyData = response.data;
      } else if (response && Array.isArray(response.recordset)) {
        historyData = response.recordset;
      }

      if (!historyData || historyData.length === 0) {
        this.loading = false;
        this.toastr.info('No recorded telemetry found for the selected date.', 'No Route Data');
        return;
      }

      this.rawCoordinates = historyData.filter(p => p.Latitude && p.Longitude);

      if (this.rawCoordinates.length < 2) {
        this.loading = false;
        this.toastr.info('Insufficient GPS points to reconstruct route playback.', 'Route Notice');
        return;
      }

      // Snap telemetry to OpenStreetMap road geometry via OSRM Match API
      this.snapToRoads(this.rawCoordinates);
    });
  }

  private snapToRoads(points: HistoricalPoint[]): void {
    this.loadingText = 'Snapping route to road network...';

    // Thin points to max 90 to comply with OSRM URL limits while preserving trajectory
    const step = Math.max(1, Math.floor(points.length / 90));
    const sample = points.filter((_, idx) => idx % step === 0 || idx === points.length - 1);

    const coordStr = sample.map(p => `${p.Longitude},${p.Latitude}`).join(';');
    const url = `https://router.project-osrm.org/match/v1/driving/${coordStr}?overview=full&geometries=geojson`;

    this.http.get(url).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.code === 'Ok' && res.matchings && res.matchings.length > 0) {
          const roadGeojsonCoords = res.matchings[0].geometry.coordinates;
          const roadPoints = roadGeojsonCoords.map((c: number[]) => L.latLng(c[1], c[0]));
          this.snappedPoints = this.densifyPath(roadPoints, 2);
        } else {
          const rawLatLngs = points.map(p => L.latLng(Number(p.Latitude), Number(p.Longitude)));
          this.snappedPoints = this.densifyPath(rawLatLngs, 2);
        }
        this.initRouteVisuals();
      },
      error: (_err: any) => {
        this.loading = false;
        const rawLatLngs = points.map(p => L.latLng(Number(p.Latitude), Number(p.Longitude)));
        this.snappedPoints = this.densifyPath(rawLatLngs, 2);
        this.initRouteVisuals();
      }
    });
  }

  private densifyPath(points: L.LatLng[], maxStepMeters: number = 2): L.LatLng[] {
    const dense: L.LatLng[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = p1.distanceTo(p2);
      dense.push(p1);

      if (dist > maxStepMeters) {
        const segments = Math.ceil(dist / maxStepMeters);
        for (let s = 1; s < segments; s++) {
          const ratio = s / segments;
          dense.push(L.latLng(
            p1.lat + (p2.lat - p1.lat) * ratio,
            p1.lng + (p2.lng - p1.lng) * ratio
          ));
        }
      }
    }
    dense.push(points[points.length - 1]);
    return dense;
  }

  // ⭐ Modern Vector Replay Puck with directional headlights and pulse waves (Sleek 30x30)
  createReplayVehicleIcon(isMoving: boolean): L.DivIcon {
    const gradientId = 'grad-replay-puck';
    const html = `
      <div class="pro-moving-puck-container is-moving">
        <div class="swiggy-headlight-cone"></div>
        <div class="swiggy-radar-ring swiggy-radar-ring-1"></div>
        <div class="swiggy-radar-ring swiggy-radar-ring-2"></div>
        <div class="vehicle-svg-puck">
          <svg viewBox="0 0 30 30" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="puck-shadow-replay" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#0f172a" flood-opacity="0.45"/>
              </filter>
              <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="100%" stop-color="#047857"/>
              </linearGradient>
              <linearGradient id="replay-windshield" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#38bdf8"/>
                <stop offset="100%" stop-color="#0284c7"/>
              </linearGradient>
            </defs>

            <!-- Side Mirrors -->
            <rect x="6.5" y="9" width="2" height="3.5" rx="1" fill="#1e293b"/>
            <rect x="21.5" y="9" width="2" height="3.5" rx="1" fill="#1e293b"/>

            <!-- Chassis Body -->
            <rect x="8.5" y="4" width="13" height="22" rx="4.5" fill="url(#${gradientId})" stroke="#ffffff" stroke-width="1.3" filter="url(#puck-shadow-replay)"/>

            <!-- Front LED Headlights -->
            <ellipse cx="11" cy="5.2" rx="1.2" ry="0.8" fill="#fef08a"/>
            <ellipse cx="19" cy="5.2" rx="1.2" ry="0.8" fill="#fef08a"/>

            <!-- Windshield Glass -->
            <path d="M 10 9 Q 15 7.8 20 9 L 19.4 12.5 Q 15 11.8 10.6 12.5 Z" fill="url(#replay-windshield)"/>

            <!-- Directional Chevron -->
            <path d="M 15 14.5 L 18 19 L 16 18.3 L 16 21.5 L 14 21.5 L 14 18.3 L 12 19 Z" fill="#ffffff" opacity="0.95"/>

            <!-- Rear Brake Lamps -->
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

  getVehicleName(): string {
    const v = this.vehicleList.find(x => String(x.BoxId) === String(this.selectedBoxId));
    return v?.VehName || ('Vehicle #' + this.selectedBoxId);
  }

  getReplayTooltipHtml(): string {
    const name = this.getVehicleName();
    const speed = this.activePoint?.Speed ? Math.round(Number(this.activePoint.Speed)) : 0;
    return `
      <div class="swiggy-fleet-pill pill-moving">
        <span class="live-dot"></span>
        <span class="pill-veh-name">${name}</span>
        <span class="pill-speed-badge">${speed} <span class="unit">km/h</span></span>
      </div>
    `;
  }

  initRouteVisuals(): void {
    if (this.snappedPoints.length === 0) return;

    // 1. Full Planned/Recorded Road Line
    this.fullRouteLine = L.polyline(this.snappedPoints, {
      color: '#94a3b8',
      weight: 5,
      opacity: 0.65,
      lineCap: 'round'
    }).addTo(this.map);

    // 2. Active Covered Trail
    this.coveredRouteLine = L.polyline([], {
      color: '#10b981',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round'
    }).addTo(this.map);

    // 3. Start & Destination Waypoints (Origin & Destination Pins)
    const startIcon = L.divIcon({
      className: 'checkpoint-origin-marker',
      html: `
        <div class="pro-route-checkpoint checkpoint-start">
          <div class="checkpoint-pulse"></div>
          <div class="checkpoint-pin">
            <i class="fa fa-play"></i>
          </div>
          <div class="checkpoint-tag">START</div>
        </div>
      `,
      iconSize: [30, 38],
      iconAnchor: [15, 30]
    });

    const endIcon = L.divIcon({
      className: 'checkpoint-dest-marker',
      html: `
        <div class="pro-route-checkpoint checkpoint-end">
          <div class="checkpoint-pulse"></div>
          <div class="checkpoint-pin">
            <i class="fa fa-flag-checkered"></i>
          </div>
          <div class="checkpoint-tag">END</div>
        </div>
      `,
      iconSize: [30, 38],
      iconAnchor: [15, 30]
    });

    const startPoint = this.snappedPoints[0];
    const endPoint = this.snappedPoints[this.snappedPoints.length - 1];

    this.startMarker = L.marker(startPoint, { icon: startIcon })
      .bindPopup('<b>Trip Origin Point</b>')
      .addTo(this.map);

    this.endMarker = L.marker(endPoint, { icon: endIcon })
      .bindPopup('<b>Trip Destination</b>')
      .addTo(this.map);

    // 4. Moving Replay Vehicle Puck
    const puckIcon = this.createReplayVehicleIcon(true);

    this.playbackMarker = (L.marker(this.snappedPoints[0], {
      icon: puckIcon,
      rotationAngle: 0,
      rotationOrigin: 'center'
    } as any) as any).addTo(this.map);

    // Show vehicle tag only on hover/click (keeps map clean)
    this.playbackMarker.bindTooltip(this.getReplayTooltipHtml(), {
      permanent: false,
      direction: 'top',
      offset: [0, -16],
      className: 'swiggy-leaflet-tooltip'
    });

    this.map.fitBounds(this.fullRouteLine.getBounds(), { padding: [50, 50] });

    this.currentIndex = 0;
    this.renderCurrentFrame();
  }

  private animateReplay = (timestamp: number): void => {
    if (!this.isPlaying) return;

    if (!this.lastAnimTime) this.lastAnimTime = timestamp;
    const delta = timestamp - this.lastAnimTime;

    const stepAdvance = Math.max(1, Math.round((delta / 16) * this.playbackMultiplier * 2));

    this.currentIndex = Math.min(this.currentIndex + stepAdvance, this.snappedPoints.length - 1);
    this.renderCurrentFrame();
    this.lastAnimTime = timestamp;

    if (this.currentIndex < this.snappedPoints.length - 1) {
      this.animFrameId = requestAnimationFrame(this.animateReplay);
    } else {
      this.pause();
    }
  };

  renderCurrentFrame(): void {
    if (!this.snappedPoints || this.snappedPoints.length === 0) return;

    const curLatLng = this.snappedPoints[this.currentIndex];

    const rawProgress = Math.floor((this.currentIndex / this.snappedPoints.length) * this.rawCoordinates.length);
    this.activePoint = this.rawCoordinates[Math.min(rawProgress, this.rawCoordinates.length - 1)];

    if (this.playbackMarker) {
      this.playbackMarker.setLatLng(curLatLng);

      const lookAhead = Math.min(this.currentIndex + 4, this.snappedPoints.length - 1);
      if (this.currentIndex < lookAhead) {
        const nextLatLng = this.snappedPoints[lookAhead];
        const bearing = this.getBearing(curLatLng, nextLatLng);
        this.playbackMarker.setRotationAngle(bearing);
      }

      this.playbackMarker.setTooltipContent(this.getReplayTooltipHtml());
    }

    this.coveredRouteLine?.setLatLngs(this.snappedPoints.slice(0, this.currentIndex + 1));

    if (this.followVehicle) {
      this.map.panTo(curLatLng, { animate: false });
    }
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play(): void {
    if (this.currentIndex >= this.snappedPoints.length - 1) {
      this.currentIndex = 0;
    }
    this.isPlaying = true;
    this.lastAnimTime = 0;
    this.animFrameId = requestAnimationFrame(this.animateReplay);
  }

  pause(): void {
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  adjustSpeed(direction: number): void {
    const speeds = [0.5, 1, 2, 4, 8];
    let idx = speeds.indexOf(this.playbackMultiplier);
    if (direction > 0 && idx < speeds.length - 1) idx++;
    if (direction < 0 && idx > 0) idx--;
    this.playbackMultiplier = speeds[idx];
  }

  stepForward(): void {
    this.currentIndex = Math.min(this.currentIndex + 100, this.snappedPoints.length - 1);
    this.renderCurrentFrame();
  }

  stepBackward(): void {
    this.currentIndex = Math.max(this.currentIndex - 100, 0);
    this.renderCurrentFrame();
  }

  resetReplay(): void {
    this.pause();
    this.currentIndex = 0;
    this.renderCurrentFrame();
  }

  onSeek(event: any): void {
    this.currentIndex = Number(event.target.value);
    this.renderCurrentFrame();
  }

  toggleFollow(): void {
    this.followVehicle = !this.followVehicle;
    if (this.followVehicle && this.snappedPoints.length > 0) {
      this.map.panTo(this.snappedPoints[this.currentIndex], { animate: true });
    }
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

  clearMapLayers(): void {
    if (this.fullRouteLine) { this.map.removeLayer(this.fullRouteLine); this.fullRouteLine = null; }
    if (this.coveredRouteLine) { this.map.removeLayer(this.coveredRouteLine); this.coveredRouteLine = null; }
    if (this.playbackMarker) { this.map.removeLayer(this.playbackMarker); this.playbackMarker = null; }
    if (this.startMarker) { this.map.removeLayer(this.startMarker); this.startMarker = null; }
    if (this.endMarker) { this.map.removeLayer(this.endMarker); this.endMarker = null; }
  }

  ngOnDestroy(): void {
    this.pause();
    this.clearMapLayers();
  }
}