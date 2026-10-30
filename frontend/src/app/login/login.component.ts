import { Component, OnInit } from '@angular/core';
import { LoginService } from './login.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  returnMsg: any;
  createMsg: any;
  showVerify: boolean = false;
  public isLogin: boolean = false;
  public isRegister: boolean = false;
  showOTPInput: boolean = false;
  isSendingOtp: boolean = false;
  isVerifyingOtp: boolean = false;

  public inputData = {
    f_name: '',
    m_name: '',
    l_name: '',
    email: '',
    phone_no: '',
    password: '',
    otp: ''
  };

  public OTP = {
    otp11: '',
    otp22: '',
    otp33: '',
    otp44: '',
    otp55: '',
    otp66: '',
  };

  mat0: any;

  constructor(
    private loginService: LoginService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkToken();
  }

  focusNext(event: any, nextInput: HTMLInputElement | null, prevInput: HTMLInputElement | null) {
    if (event.inputType === 'deleteContentBackward' && prevInput) {
      prevInput.focus();
    } else if (event.target.value.length >= 1 && nextInput) {
      nextInput.focus();
    }
  }

  checkToken() {
    try {
      const rawToken = localStorage.getItem('token');
      if (rawToken) {
        let token = JSON.parse(rawToken);
        if (typeof token === 'string') {
          token = JSON.parse(token);
        }
        if (token) {
          const userRole = (token.usr?.role || '').toString().toLowerCase().trim();
          if (userRole === 'fuel manager' || userRole === 'fuel_manager') {
            this.router.navigate(['/fuel-management']);
          } else {
            this.router.navigate(['/home']);
          }
        }
      }
    } catch (e) {
      console.log('No valid token found');
    }
  }

  validateEmail(): boolean {
    if (this.returnMsg === 'notExist') {
      this.toastr.error('This email is not registered in the system.', 'Access Denied');
      return false;
    }
    return true;
  }

  sendOtp() {
    const regExp_email = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!this.inputData.email || !regExp_email.test(this.inputData.email.trim())) {
      this.toastr.warning('Please enter a valid official email address', 'Invalid Email');
      return;
    }

    this.isSendingOtp = true;
    this.loginService.verifyEmail(this.inputData.email.trim(), (res: any) => {
      this.returnMsg = res ? res.message : null;

      if (this.returnMsg === 'notExist') {
        this.isSendingOtp = false;
        this.toastr.error('This email is not registered with GMC ICCC.', 'Access Denied');
        return;
      }

      this.mat0 = Math.floor(100000 + Math.random() * 900000);
      this.inputData.otp = this.mat0;

      this.loginService.sendOtp(this.inputData, (otpRes: any) => {
        this.isSendingOtp = false;
        this.returnMsg = otpRes ? otpRes.message : null;

        if (this.returnMsg === 'success') {
          this.toastr.success(`Verification code sent to ${this.inputData.email}`, 'Passcode Dispatched');
          this.showOTPInput = true;
        } else {
          // If sending email service fails or is running locally in test mode, still let them proceed or notify
          this.toastr.info(`Development mode OTP: ${this.mat0}`, 'Passcode Generated');
          this.showOTPInput = true;
        }
      });
    });
  }

  changeEmail() {
    this.showOTPInput = false;
    this.OTP = {
      otp11: '',
      otp22: '',
      otp33: '',
      otp44: '',
      otp55: '',
      otp66: '',
    };
  }

  verifyOtpData() {
    const otpCode = `${this.OTP.otp11}${this.OTP.otp22}${this.OTP.otp33}${this.OTP.otp44}${this.OTP.otp55}${this.OTP.otp66}`;

    if (otpCode.length < 6) {
      this.toastr.warning('Please enter the complete 6-digit verification code.', 'Incomplete Code');
      return;
    }

    const enteredOtp = parseInt(otpCode, 10);
    if (enteredOtp !== this.mat0) {
      this.toastr.error('The code entered does not match. Please verify and try again.', 'Incorrect Passcode');
      return;
    }

    this.isVerifyingOtp = true;
    this.toastr.success('Passcode verified successfully. Logging in...', 'Authentication Granted');
    this.showVerify = true;

    this.loginService.loginVerify(this.inputData, (res: any) => {
      this.isVerifyingOtp = false;
      if (res && res.status === true) {
        const data = res.message;
        localStorage.setItem('token', JSON.stringify(data));
        this.toastr.success('Welcome back to GMC ICCC!', 'Login Successful');
        setTimeout(() => {
          const userRole = (data?.usr?.role || '').toString().toLowerCase().trim();
          if (userRole === 'fuel manager' || userRole === 'fuel_manager') {
            window.location.href = '/fuel-management';
          } else {
            window.location.href = '/vehicle-master';
          }
        }, 500);
      } else {
        this.toastr.error('Failed to establish session. Please try again.', 'Login Error');
      }
    });
  }
}
