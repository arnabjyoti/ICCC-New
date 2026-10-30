import { Component, OnInit } from '@angular/core';
import { FuelManagementService } from './fuel-management.service';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-fuel-management',
  templateUrl: './fuel-management.component.html',
  styleUrls: ['./fuel-management.component.css']
})
export class FuelManagementComponent implements OnInit {
  activeTab: 'dashboard' | 'logs' | 'entry' | 'alerts' | 'calibration' = 'dashboard';

  // Summary Metrics
  summary: any = {
    totalFuelCost: 0,
    totalLitersFilled: 0,
    averageFleetMileage: 0,
    suspectedLossCost: 0,
    suspectedLitersWasted: 0,
    activeAlertsCount: 0,
    verifiedLogsCount: 0,
    flaggedLogsCount: 0,
    totalVehicles: 0
  };

  // Lists
  vehicles: any[] = [];
  drivers: any[] = [];
  fuelLogs: any[] = [];
  fuelAlerts: any[] = [];
  selectedReceiptImage: string | null = null;

  // Search & Filtering
  searchText: string = '';
  filteredFuelLogs: any[] = [];
  searchCalibrationText: string = '';
  filteredVehicles: any[] = [];

  // Filters for logs
  filterVehicleId: string = '';
  filterStatus: string = '';
  filterStartDate: string = '';
  filterEndDate: string = '';

  // Filter for alerts
  alertFilterStatus: string = 'OPEN';

  // New Fuel Entry Form
  newLog: any = {
    vehicle_id: '',
    driver_id: '',
    fill_date: new Date().toISOString().substring(0, 16),
    liters_filled: null,
    rate_per_liter: 92.50,
    total_cost: 0,
    fuel_station: '',
    odometer_km: null,
    remarks: ''
  };
  selectedFile: File | null = null;
  receiptPreviewUrl: string | null = null;
  selectedOdometerFile: File | null = null;
  odometerPreviewUrl: string | null = null;
  selectedVehicleData: any = null;
  selectedVehicleLastOdo: number | null = null;
  loadingVehicleInfo: boolean = false;
  formSubmitted: boolean = false;
  viewModalImage: { title: string; url: string } | null = null;

  // Selected Vehicle Calibration Modal/Inline
  editingVehicle: any = null;

  // Alert Resolution Modal
  selectedAlertForResolution: any = null;
  resolutionNotes: string = '';

  constructor(
    public fuelService: FuelManagementService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.loadVehicles();
    this.loadDrivers();
    this.loadSummary();
    this.loadLogs();
    this.loadAlerts();
  }

  // Switch Tab
  setTab(tab: 'dashboard' | 'logs' | 'entry' | 'alerts' | 'calibration'): void {
    this.activeTab = tab;
    if (tab === 'dashboard') this.loadSummary();
    if (tab === 'logs') this.loadLogs();
    if (tab === 'alerts') this.loadAlerts();
    if (tab === 'calibration') this.loadVehicles();
  }

  // Load Vehicles
  loadVehicles(): void {
    this.fuelService.getVehicles().subscribe(
      (res: any) => {
        if (res && res.data) {
          this.vehicles = res.data;
        } else if (Array.isArray(res)) {
          this.vehicles = res;
        }
        this.filterCalibration();
      },
      (err: any) => {
        console.error('Error loading vehicles:', err);
      }
    );
  }

  // Load Drivers
  loadDrivers(): void {
    this.fuelService.getDrivers().subscribe(
      (res: any) => {
        if (res && res.data) {
          this.drivers = res.data;
        } else if (Array.isArray(res)) {
          this.drivers = res;
        }
      },
      (err: any) => {
        console.error('Error loading drivers:', err);
      }
    );
  }

  // Load Summary
  loadSummary(): void {
    this.fuelService.getFuelSummary().subscribe(
      (res: any) => {
        if (res && res.success) {
          this.summary = res.summary;
        }
      },
      (err: any) => {
        console.error('Error loading summary:', err);
      }
    );
  }

  // Load Fuel Logs
  loadLogs(): void {
    this.spinner.show();
    const params: any = {};
    if (this.filterVehicleId) params.vehicle_id = this.filterVehicleId;
    if (this.filterStatus) params.audit_status = this.filterStatus;
    if (this.filterStartDate && this.filterEndDate) {
      params.startDate = this.filterStartDate;
      params.endDate = this.filterEndDate;
    }

    this.fuelService.getFuelLogs(params).subscribe(
      (res: any) => {
        this.spinner.hide();
        if (res && res.success) {
          this.fuelLogs = res.data || [];
          this.filterLogs();
        }
      },
      (err: any) => {
        this.spinner.hide();
        console.error('Error loading fuel logs:', err);
        this.toastr.error('Failed to load fuel records');
      }
    );
  }

  // Load Alerts
  loadAlerts(): void {
    this.fuelService.getFuelAlerts(this.alertFilterStatus).subscribe(
      (res: any) => {
        if (res && res.success) {
          this.fuelAlerts = res.data || [];
        }
      },
      (err: any) => {
        console.error('Error loading fuel alerts:', err);
      }
    );
  }

  // Calculate Total Cost dynamically
  onLitersOrRateChange(): void {
    const liters = parseFloat(this.newLog.liters_filled) || 0;
    const rate = parseFloat(this.newLog.rate_per_liter) || 0;
    this.newLog.total_cost = Math.round(liters * rate * 100) / 100;
  }

  // Vehicle selection in refuel form
  onVehicleSelect(vehicleId: any): void {
    this.newLog.vehicle_id = vehicleId;
    this.selectedVehicleData = this.vehicles.find(v => String(v.id) === String(vehicleId)) || null;
    this.selectedVehicleLastOdo = null;

    if (!vehicleId) return;

    this.loadingVehicleInfo = true;
    this.fuelService.getLastRefuelInfo(vehicleId).subscribe(
      (res: any) => {
        this.loadingVehicleInfo = false;
        if (res && res.success && res.data) {
          this.selectedVehicleLastOdo = res.data.last_odometer_km !== null ? parseFloat(res.data.last_odometer_km) : null;
          if (this.selectedVehicleData && res.data.tank_capacity) {
            this.selectedVehicleData.tank_capacity = res.data.tank_capacity;
          }
        }
      },
      (err: any) => {
        this.loadingVehicleInfo = false;
        console.error('Error fetching last refuel info:', err);
      }
    );
  }

  // Odometer File Selection (Mandatory)
  onOdometerFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedOdometerFile = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.odometerPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedOdometerFile as Blob);
    }
  }

  removeOdometerFile(): void {
    this.selectedOdometerFile = null;
    this.odometerPreviewUrl = null;
    const fileInput = document.getElementById('odometerFileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // Receipt File Selection (Optional)
  onReceiptFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.receiptPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile as Blob);
    }
  }

  // Alias for backward compatibility
  onFileSelected(event: any): void {
    this.onReceiptFileSelected(event);
  }

  removeReceiptFile(): void {
    this.selectedFile = null;
    this.receiptPreviewUrl = null;
    const fileInput = document.getElementById('receiptFileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  getCurrentUser(): any {
    try {
      const rawToken = localStorage.getItem('token');
      if (rawToken) {
        let token = JSON.parse(rawToken);
        if (typeof token === 'string') token = JSON.parse(token);
        return token && token.usr ? token.usr : null;
      }
    } catch (e) {
      console.error('Error parsing token:', e);
    }
    return null;
  }

  // Save new refuel entry with strict validations
  submitFuelLog(): void {
    this.formSubmitted = true;

    // 1. Vehicle Selection
    if (!this.newLog.vehicle_id) {
      this.toastr.warning('Please select a vehicle', 'Vehicle Required');
      return;
    }

    // 2. Liters Filled Validation
    const litersNum = parseFloat(this.newLog.liters_filled);
    if (!this.newLog.liters_filled || isNaN(litersNum) || litersNum <= 0) {
      this.toastr.warning('Please enter valid liters filled (greater than 0)', 'Invalid Liters');
      return;
    }

    // 3. Tank Capacity Check: Liters Filled cannot exceed Tank Capacity
    const tankCapacity = this.selectedVehicleData?.tank_capacity 
      ? parseFloat(this.selectedVehicleData.tank_capacity) 
      : 150;
    if (litersNum > tankCapacity) {
      this.toastr.error(
        `Liters filled (${litersNum} L) cannot be bigger than the vehicle tank capacity (${tankCapacity} L).`,
        'Tank Capacity Exceeded'
      );
      return;
    }

    // 4. Rate per Liter Validation
    const rateNum = parseFloat(this.newLog.rate_per_liter);
    if (!this.newLog.rate_per_liter || isNaN(rateNum) || rateNum <= 0) {
      this.toastr.warning('Please enter a valid fuel rate per liter', 'Invalid Rate');
      return;
    }

    // 5. Current Odometer Validation
    if (this.newLog.odometer_km === null || this.newLog.odometer_km === undefined || this.newLog.odometer_km === '') {
      this.toastr.warning('Current odometer reading is required', 'Odometer Reading Missing');
      return;
    }

    const currentOdo = parseFloat(this.newLog.odometer_km);
    if (isNaN(currentOdo) || currentOdo < 0) {
      this.toastr.warning('Please enter a valid positive odometer reading', 'Invalid Odometer');
      return;
    }

    // 6. Current Odometer cannot be lower than Previous Odometer
    if (this.selectedVehicleLastOdo !== null && currentOdo < this.selectedVehicleLastOdo) {
      this.toastr.error(
        `Current Odometer (${currentOdo} km) cannot be lower than the previous recorded reading (${this.selectedVehicleLastOdo} km).`,
        'Odometer Decrement Error'
      );
      return;
    }

    // 7. Mandatory Odometer Image Check
    if (!this.selectedOdometerFile) {
      this.toastr.error(
        'Odometer image is mandatory. Please capture or upload a clear photo of the odometer.',
        'Odometer Proof Required'
      );
      return;
    }

    this.spinner.show();
    const currentUser = this.getCurrentUser();
    let recordedBy = 'Admin';
    if (currentUser) {
      const nameParts = [currentUser.f_name, currentUser.l_name].filter(Boolean).join(' ').trim();
      const rolePart = currentUser.role ? ` (${currentUser.role})` : '';
      recordedBy = (nameParts || currentUser.email || 'Admin') + rolePart;
    }

    const formData = new FormData();
    formData.append('vehicle_id', this.newLog.vehicle_id);
    if (this.newLog.driver_id) formData.append('driver_id', this.newLog.driver_id);
    formData.append('fill_date', this.newLog.fill_date);
    formData.append('liters_filled', this.newLog.liters_filled);
    formData.append('rate_per_liter', this.newLog.rate_per_liter);
    formData.append('total_cost', this.newLog.total_cost);
    formData.append('fuel_station', this.newLog.fuel_station || '');
    formData.append('odometer_km', this.newLog.odometer_km);
    formData.append('remarks', this.newLog.remarks || '');
    formData.append('created_by', recordedBy);
    
    // Append mandatory odometer image
    formData.append('odometer_image', this.selectedOdometerFile);

    // Append optional receipt image
    if (this.selectedFile) {
      formData.append('receipt', this.selectedFile);
    }

    this.fuelService.saveFuelLog(formData).subscribe(
      (res: any) => {
        this.spinner.hide();
        if (res && res.success) {
          const log = res.data;
          if (log.audit_status === 'FLAGGED_SUSPICIOUS') {
            this.toastr.warning(`Entry Saved with Warning: ${log.audit_flag_reason}`, 'Audit Alert Raised', { timeOut: 8000 });
          } else {
            this.toastr.success('Refuel log submitted and verified successfully!');
          }
          this.resetEntryForm();
          this.setTab('logs');
          this.loadSummary();
        }
      },
      (err: any) => {
        this.spinner.hide();
        console.error('Error saving fuel log:', err);
        this.toastr.error(err.error?.message || 'Error saving fuel record');
      }
    );
  }

  resetEntryForm(): void {
    this.newLog = {
      vehicle_id: '',
      driver_id: '',
      fill_date: new Date().toISOString().substring(0, 16),
      liters_filled: null,
      rate_per_liter: 92.50,
      total_cost: 0,
      fuel_station: '',
      odometer_km: null,
      remarks: ''
    };
    this.selectedFile = null;
    this.receiptPreviewUrl = null;
    this.selectedOdometerFile = null;
    this.odometerPreviewUrl = null;
    this.selectedVehicleData = null;
    this.selectedVehicleLastOdo = null;
    this.loadingVehicleInfo = false;
    this.formSubmitted = false;
    const odoInput = document.getElementById('odometerFileInput') as HTMLInputElement;
    if (odoInput) odoInput.value = '';
    const recInput = document.getElementById('receiptFileInput') as HTMLInputElement;
    if (recInput) recInput.value = '';
  }

  // Delete fuel log
  deleteLog(id: number): void {
    if (!confirm('Are you sure you want to delete this fuel record?')) return;
    this.fuelService.deleteFuelLog(id).subscribe(
      (res: any) => {
        if (res && res.success) {
          this.toastr.success('Record deleted');
          this.loadLogs();
          this.loadSummary();
        }
      },
      (err: any) => {
        this.toastr.error('Failed to delete record');
      }
    );
  }

  // Open Alert Resolution Modal
  openResolveModal(alert: any): void {
    this.selectedAlertForResolution = alert;
    this.resolutionNotes = '';
  }

  // Close Alert Resolution Modal
  closeResolveModal(): void {
    this.selectedAlertForResolution = null;
    this.resolutionNotes = '';
  }

  // Submit Alert Resolution
  submitAlertResolution(status: 'RESOLVED' | 'DISMISSED'): void {
    if (!this.selectedAlertForResolution) return;

    this.fuelService.resolveFuelAlert({
      id: this.selectedAlertForResolution.id,
      status,
      resolution_notes: this.resolutionNotes
    }).subscribe(
      (res: any) => {
        if (res && res.success) {
          this.toastr.success(`Alert marked as ${status}`);
          this.closeResolveModal();
          this.loadAlerts();
          this.loadSummary();
        }
      },
      (err: any) => {
        this.toastr.error('Failed to update alert');
      }
    );
  }

  // Search & Filter Methods
  filterLogs(): void {
    if (!this.searchText || !this.searchText.trim()) {
      this.filteredFuelLogs = [...this.fuelLogs];
      return;
    }
    const q = this.searchText.trim().toLowerCase();
    this.filteredFuelLogs = this.fuelLogs.filter(log => {
      const vehicleNo = (log.vehicle?.vehicle_no || '').toLowerCase();
      const station = (log.fuel_station || '').toLowerCase();
      const driver = (log.driver?.driver_name || '').toLowerCase();
      const auditStatus = (log.audit_status || '').toLowerCase();
      const remarks = (log.remarks || '').toLowerCase();
      const createdBy = (log.created_by || '').toLowerCase();
      const auditReason = (log.audit_flag_reason || '').toLowerCase();
      const liters = log.liters_filled ? String(log.liters_filled) : '';
      const cost = log.total_cost ? String(log.total_cost) : '';
      const currOdo = log.odometer_km ? String(log.odometer_km) : '';
      const odoDist = log.odometer_distance_km ? String(log.odometer_distance_km) : '';
      const gpsDist = log.gps_distance_km ? String(log.gps_distance_km) : '';

      return vehicleNo.includes(q) ||
             station.includes(q) ||
             driver.includes(q) ||
             auditStatus.includes(q) ||
             remarks.includes(q) ||
             createdBy.includes(q) ||
             auditReason.includes(q) ||
             liters.includes(q) ||
             cost.includes(q) ||
             currOdo.includes(q) ||
             odoDist.includes(q) ||
             gpsDist.includes(q);
    });
  }

  clearSearch(): void {
    this.searchText = '';
    this.filterLogs();
  }

  filterCalibration(): void {
    if (!this.searchCalibrationText || !this.searchCalibrationText.trim()) {
      this.filteredVehicles = [...this.vehicles];
      return;
    }
    const q = this.searchCalibrationText.trim().toLowerCase();
    this.filteredVehicles = this.vehicles.filter(v => {
      const vNo = (v.vehicle_no || '').toLowerCase();
      const box = (v.box_id || '').toLowerCase();
      const vType = (v.vehicle_type || '').toLowerCase();
      const fType = (v.fuel_type || '').toLowerCase();
      return vNo.includes(q) || box.includes(q) || vType.includes(q) || fType.includes(q);
    });
  }

  clearCalibrationSearch(): void {
    this.searchCalibrationText = '';
    this.filterCalibration();
  }

  // Export Fuel Records to Excel
  exportToExcel(): void {
    const listToExport = this.filteredFuelLogs && this.filteredFuelLogs.length > 0 ? this.filteredFuelLogs : this.fuelLogs;
    if (!listToExport || listToExport.length === 0) {
      this.toastr.warning('No fuel records available to export.');
      return;
    }

    const exportRows = listToExport.map((log: any, index: number) => {
      const currOdo = log.odometer_km !== null && log.odometer_km !== undefined ? parseFloat(log.odometer_km) : null;
      const prevOdo = log.previous_odometer_km !== null && log.previous_odometer_km !== undefined ? parseFloat(log.previous_odometer_km) : null;
      
      let odoDist = log.odometer_distance_km !== null && log.odometer_distance_km !== undefined
        ? parseFloat(log.odometer_distance_km)
        : (currOdo !== null && prevOdo !== null && currOdo >= prevOdo ? Math.round((currOdo - prevOdo) * 10) / 10 : null);

      const gpsDist = log.gps_distance_km !== null && log.gps_distance_km !== undefined ? parseFloat(log.gps_distance_km) : null;
      const distDiff = (odoDist !== null && gpsDist !== null) ? Math.round(Math.abs(odoDist - gpsDist) * 10) / 10 : null;

      let dateFormatted = '';
      if (log.fill_date) {
        const d = new Date(log.fill_date);
        dateFormatted = !isNaN(d.getTime()) ? d.toLocaleString('en-GB') : String(log.fill_date);
      }

      return {
        'Sl No': index + 1,
        'Refuel Date': dateFormatted,
        'Vehicle Registration': log.vehicle?.vehicle_no || 'N/A',
        'Vehicle Type': log.vehicle?.vehicle_type || 'Fleet',
        'Fuel Station / Pump': log.fuel_station || 'Unknown Pump',
        'Driver / Operator': log.driver?.driver_name || 'Unassigned',
        'Fuel Type': log.vehicle?.fuel_type || 'Diesel',
        'Liters Filled (L)': log.liters_filled ? parseFloat(log.liters_filled) : 0,
        'Rate / Liter (₹)': log.rate_per_liter ? parseFloat(log.rate_per_liter) : 0,
        'Total Cost (₹)': log.total_cost ? parseFloat(log.total_cost) : 0,
        'Previous Odometer (km)': prevOdo !== null ? prevOdo : '—',
        'Current Odometer (km)': currOdo !== null ? currOdo : '—',
        'Odometer Distance (km)': odoDist !== null ? odoDist : '—',
        'GPS Distance (km)': gpsDist !== null ? gpsDist : '—',
        'Distance Difference (km)': distDiff !== null ? distDiff : '—',
        'Calculated Mileage (km/L)': log.calculated_mileage !== null ? parseFloat(log.calculated_mileage) : '—',
        'Benchmark Mileage (km/L)': log.expected_mileage !== null ? parseFloat(log.expected_mileage) : (log.vehicle?.expected_mileage || 4.5),
        'Mileage Variance (%)': log.mileage_variance_percent !== null ? parseFloat(log.mileage_variance_percent) : '—',
        'Audit Status': log.audit_status || 'VERIFIED',
        'Audit Flag Reason': log.audit_flag_reason || '',
        'Entered By': log.created_by || 'Admin',
        'Remarks': log.remarks || ''
      };
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportRows);
    
    // Auto-fit column widths
    const columnKeys = Object.keys(exportRows[0]);
    worksheet['!cols'] = columnKeys.map(key => {
      const maxLen = Math.max(
        key.length,
        ...exportRows.map(row => ((row as any)[key] ? String((row as any)[key]).length : 0))
      );
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Fuel Records': worksheet },
      SheetNames: ['Fuel Records']
    };

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Fuel_Management_Records_${todayStr}.xlsx`);
    this.toastr.success(`Exported ${exportRows.length} fuel records to Excel!`);
  }

  // Edit Vehicle Calibration
  editCalibration(vehicle: any): void {
    if (!vehicle) return;
    this.editingVehicle = {
      ...vehicle,
      id: vehicle.id,
      vehicle_no: vehicle.vehicle_no,
      fuel_type: vehicle.fuel_type || 'Diesel',
      tank_capacity: (vehicle.tank_capacity !== null && vehicle.tank_capacity !== undefined && !isNaN(parseFloat(vehicle.tank_capacity)))
        ? parseFloat(vehicle.tank_capacity)
        : 150,
      expected_mileage: (vehicle.expected_mileage !== null && vehicle.expected_mileage !== undefined && !isNaN(parseFloat(vehicle.expected_mileage)))
        ? parseFloat(vehicle.expected_mileage)
        : 4.5
    };
  }

  saveCalibration(): void {
    if (!this.editingVehicle) return;

    const tankCap = parseFloat(this.editingVehicle.tank_capacity);
    const expMileage = parseFloat(this.editingVehicle.expected_mileage);

    if (isNaN(tankCap) || tankCap <= 0) {
      this.toastr.warning('Please enter a valid tank capacity (greater than 0 liters)');
      return;
    }
    if (isNaN(expMileage) || expMileage <= 0) {
      this.toastr.warning('Please enter a valid benchmark mileage (greater than 0 km/L)');
      return;
    }

    const payload = {
      vehicle_id: this.editingVehicle.id,
      id: this.editingVehicle.id,
      vehicle_no: this.editingVehicle.vehicle_no,
      box_id: this.editingVehicle.box_id,
      fuel_type: this.editingVehicle.fuel_type || 'Diesel',
      tank_capacity: tankCap,
      expected_mileage: expMileage
    };

    this.spinner.show();
    this.fuelService.updateVehicleFuelProfile(payload).subscribe(
      (res: any) => {
        this.spinner.hide();
        if (res && res.success) {
          this.toastr.success(`Tank calibration for ${this.editingVehicle.vehicle_no} updated successfully!`);
          
          // Update local arrays immediately
          const updateItem = (list: any[]) => {
            const idx = list.findIndex(v => (payload.id && v.id === payload.id) || v.vehicle_no === payload.vehicle_no);
            if (idx !== -1) {
              list[idx].fuel_type = payload.fuel_type;
              list[idx].tank_capacity = payload.tank_capacity;
              list[idx].expected_mileage = payload.expected_mileage;
            }
          };
          updateItem(this.vehicles);
          updateItem(this.filteredVehicles);

          if (this.selectedVehicleData && (this.selectedVehicleData.id === payload.id || this.selectedVehicleData.vehicle_no === payload.vehicle_no)) {
            this.selectedVehicleData.fuel_type = payload.fuel_type;
            this.selectedVehicleData.tank_capacity = payload.tank_capacity;
            this.selectedVehicleData.expected_mileage = payload.expected_mileage;
          }

          this.editingVehicle = null;
          this.loadVehicles();
        } else {
          this.toastr.error(res?.message || 'Failed to update calibration');
        }
      },
      (err: any) => {
        this.spinner.hide();
        console.error('saveCalibration error:', err);
        this.toastr.error(err?.error?.message || 'Failed to update calibration');
      }
    );
  }

  cancelCalibration(): void {
    this.editingVehicle = null;
  }

  // Modal Image Preview (Odometer or Receipt)
  viewImageModal(title: string, fileName: string, type: 'odometer' | 'receipt'): void {
    const subfolder = type === 'odometer' ? 'fuel_odometers' : 'fuel_receipts';
    this.viewModalImage = {
      title,
      url: `${this.fuelService['baseUrl']}/image/${subfolder}/${fileName}`
    };
  }

  closeImageModal(): void {
    this.viewModalImage = null;
    this.selectedReceiptImage = null;
  }

  // View Receipt Modal (backward compatibility)
  viewReceipt(receiptFileName: string): void {
    this.viewImageModal('Fuel Pump Receipt', receiptFileName, 'receipt');
  }

  closeReceiptModal(): void {
    this.closeImageModal();
  }
}
