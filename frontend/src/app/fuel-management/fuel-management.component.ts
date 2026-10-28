import { Component, OnInit } from '@angular/core';
import { FuelManagementService } from './fuel-management.service';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';

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

  // Selected Vehicle Calibration Modal/Inline
  editingVehicle: any = null;

  // Alert Resolution Modal
  selectedAlertForResolution: any = null;
  resolutionNotes: string = '';

  constructor(
    private fuelService: FuelManagementService,
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

  // File selection
  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  // Save new refuel entry
  submitFuelLog(): void {
    if (!this.newLog.vehicle_id) {
      this.toastr.warning('Please select a vehicle');
      return;
    }
    if (!this.newLog.liters_filled || this.newLog.liters_filled <= 0) {
      this.toastr.warning('Please enter valid liters filled');
      return;
    }

    this.spinner.show();
    const formData = new FormData();
    formData.append('vehicle_id', this.newLog.vehicle_id);
    if (this.newLog.driver_id) formData.append('driver_id', this.newLog.driver_id);
    formData.append('fill_date', this.newLog.fill_date);
    formData.append('liters_filled', this.newLog.liters_filled);
    formData.append('rate_per_liter', this.newLog.rate_per_liter);
    formData.append('total_cost', this.newLog.total_cost);
    formData.append('fuel_station', this.newLog.fuel_station || '');
    if (this.newLog.odometer_km) formData.append('odometer_km', this.newLog.odometer_km);
    formData.append('remarks', this.newLog.remarks || '');
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

  // Edit Vehicle Calibration
  editCalibration(vehicle: any): void {
    this.editingVehicle = { ...vehicle };
  }

  saveCalibration(): void {
    if (!this.editingVehicle) return;

    this.fuelService.updateVehicleFuelProfile({
      vehicle_id: this.editingVehicle.id,
      fuel_type: this.editingVehicle.fuel_type,
      tank_capacity: parseFloat(this.editingVehicle.tank_capacity),
      expected_mileage: parseFloat(this.editingVehicle.expected_mileage)
    }).subscribe(
      (res: any) => {
        if (res && res.success) {
          this.toastr.success('Vehicle calibration updated');
          this.editingVehicle = null;
          this.loadVehicles();
        }
      },
      (err: any) => {
        this.toastr.error('Failed to update calibration');
      }
    );
  }

  cancelCalibration(): void {
    this.editingVehicle = null;
  }

  // View Receipt Modal
  viewReceipt(receiptFileName: string): void {
    this.selectedReceiptImage = `${this.fuelService['baseUrl']}/image/fuel_receipts/${receiptFileName}`;
  }

  closeReceiptModal(): void {
    this.selectedReceiptImage = null;
  }
}
