import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, of, ReplaySubject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IAddress } from '../shared/models/address';
import { IUser } from '../shared/models/user';

// تعريف واجهة للبيانات المرسلة للتسجيل الدخول
interface LoginData {
    email: string;
    password: string;
    accountType: 'customer' | 'worker';
}

@Injectable({
    providedIn: 'root'
})
export class AccountService {
    // تعريف رابط API الأساسي
    baseUrl = environment.apiUrl;
    // إنشاء ReplaySubject لتخزين بيانات المستخدم الحالي
    private currentUserSource = new ReplaySubject<IUser | null>(1);
    // Observable للمستخدم الحالي
    currentUser$ = this.currentUserSource.asObservable();

    constructor(private http: HttpClient, private router: Router) { }

    // تحميل بيانات المستخدم الحالي باستخدام الـ Token
    loadCurrentUser(token: string) {
        if (token == null) {
            // إذا ما فيش Token، نضع المستخدم كـ null
            this.currentUserSource.next(null);
            return of(null);
        }

        let headers = new HttpHeaders();
        // إضافة Header للتوثيق باستخدام Bearer Token
        headers = headers.set('Authorization', `Bearer ${token}`);

        return this.http.get<IUser>(this.baseUrl + 'account', {headers}).pipe(
            // معالجة الاستجابة وتخزين بيانات المستخدم
            map((user: IUser | null) => {
                if (user) {
                    // حفظ الـ Token في localStorage
                    localStorage.setItem('token', user.token);
                    // تحديث المستخدم الحالي
                    this.currentUserSource.next(user);
                }
                return user;
            }),
            catchError(error => {
                console.error('Error loading current user:', error);
                return of(null);
            })
        );
    }

    // تسجيل الدخول مع نوع الحساب
    login(values: LoginData) {
        let url = '';

        // تحديد الرابط بناءً على نوع الحساب
        if (values.accountType === 'customer') {
            url = this.baseUrl + 'accounts/login/customer';
        } else if (values.accountType === 'worker') {
            url = this.baseUrl + 'accounts/login/worker';
        }

        // إرسال طلب POST لتسجيل الدخول
        return this.http.post<IUser>(url, { email: values.email, password: values.password }).pipe(
            // معالجة الاستجابة وتخزين بيانات المستخدم
            map((user: IUser | null) => {
                if (user) {
                    // حفظ الـ Token في localStorage
                    localStorage.setItem('token', user.token);
                    // تحديث المستخدم الحالي
                    this.currentUserSource.next(user);
                }
                return user;
            }),
            catchError(error => {
                console.error('Error logging in:', error);
                return of(null);
            })
        );
    }

    // تسجيل حساب جديد (مع دعم FormData ونوع الحساب)
    register(formData: FormData) {
        // الحصول على نوع الحساب من FormData
        const accountType = formData.get('accountType')?.toString() as 'customer' | 'worker';
        let url = '';

        // تحديد الرابط بناءً على نوع الحساب
        if (accountType === 'customer') {
            url = this.baseUrl + 'accounts/register/customer';
        } else if (accountType === 'worker') {
            url = this.baseUrl + 'accounts/register/worker';
        }

        // إرسال طلب POST مع FormData (يدعم النصوص والملفات)
        return this.http.post<IUser>(url, formData).pipe(
            // معالجة الاستجابة وتخزين بيانات المستخدم
            map((user: IUser | null) => {
                if (user) {
                    // حفظ الـ Token في localStorage
                    localStorage.setItem('token', user.token);
                    // تحديث المستخدم الحالي
                    this.currentUserSource.next(user);
                }
                return user; // إرجاع الـ User للاستخدام في الـ Component
            }),
            catchError(error => {
                console.error('Error registering:', error);
                return of(null);
            })
        );
    }

    // تسجيل الخروج
    logout() {
        // حذف الـ Token من localStorage
        localStorage.removeItem('token');
        // تعيين المستخدم الحالي كـ null
        this.currentUserSource.next(null);
        // توجيه المستخدم للصفحة الرئيسية
        this.router.navigateByUrl('/');
    }

    // التحقق من تكرار الإيميل
    checkEmailExists(email: string) {
        // إرسال طلب GET للتحقق من وجود الإيميل
        return this.http.get<boolean>(this.baseUrl + 'accounts/emailexists?email=' + email).pipe(
            catchError(error => {
                console.error('Error checking email existence:', error);
                return of(false); // رجوع false لو فيه خطأ
            })
        );
    }

    // التحقق من تكرار الرقم
    checkPhoneNumberExists(phoneNumber: string) {
        // إرسال طلب GET للتحقق من وجود الرقم
        return this.http.get<boolean>(this.baseUrl + 'accounts/phonenumberexists?phoneNumber=' + phoneNumber).pipe(
            catchError(error => {
                console.error('Error checking phone number existence:', error);
                return of(false); // رجوع false لو فيه خطأ
            })
        );
    }

    // جلب عنوان المستخدم
    getUserAddress() {
        // إرسال طلب GET لجلب عنوان المستخدم
        return this.http.get<IAddress>(this.baseUrl + 'accounts/address');
    }

    // تحديث عنوان المستخدم
    updateUserAddress(address: IAddress) {
        // إرسال طلب PUT لتحديث العنوان
        return this.http.put<IAddress>(this.baseUrl + 'accounts/address', address);
    }
    updateCurrentUser(user: IUser | null) {
      this.currentUserSource.next(user);
    }
}



/*
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, of, ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IAddress } from '../shared/models/address';
import { IUser } from '../shared/models/user';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  baseUrl = environment.apiUrl;
  private currentUserSource = new ReplaySubject<IUser>(1);
  currentUser$ = this.currentUserSource.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  loadCurrentUser(token: string) {
    if (token == null) {
      this.currentUserSource.next(null);
      return of(null);
    }

    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${token}`);

    return this.http.get(this.baseUrl + 'account', {headers}).pipe(
      map((user: IUser) => {
        if (user) {
          localStorage.setItem('token', user.token);
          this.currentUserSource.next(user);
        }
      })
    )
  }

  login(values: any) {
    return this.http.post(this.baseUrl + 'accounts/login', values).pipe(
      map((user: IUser) => {
        if (user) {
          localStorage.setItem('token', user.token);
          this.currentUserSource.next(user);
        }
      })
    )
  }

  register(values: any) {
    return this.http.post(this.baseUrl + 'accounts/register', values).pipe(
      map((user: IUser) => {
        if (user) {
          localStorage.setItem('token', user.token);
          this.currentUserSource.next(user);
        }
      })
    )
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUserSource.next(null);
    this.router.navigateByUrl('/');
  }

  checkEmailExists(email: string) {
    return this.http.get(this.baseUrl + 'accounts/emailexists?email=' + email);
  }

  getUserAddress() {
    return this.http.get<IAddress>(this.baseUrl + 'accounts/address');
  }

  updateUserAddress(address: IAddress) {
    return this.http.put<IAddress>(this.baseUrl + 'accounts/address', address);
  }
}*/



/*// src/app/account/account.service.ts
import { HttpClient, HttpHeaders, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IAddress } from '../shared/models/address';
import { IUser } from '../shared/models/user';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  baseUrl = environment.apiUrl;
  private currentUserSource = new BehaviorSubject<IUser | null>(null);
  currentUser$ = this.currentUserSource.asObservable();

  // Mock local database (array to store users)
  private users: IUser[] = [];

  constructor(private http: HttpClient, private router: Router) { }

  // Simulate register by storing in local array instead of HTTP request
  register(formData: FormData): Observable<IUser> {
    const userData: any = {};
    formData.forEach((value, key) => {
      if (key === 'idCard' && value instanceof File) {
        userData[key] = value.name; // Store file name for simplicity
      } else {
        userData[key] = value;
      }
    });

    // Create a new user object
    const newUser: IUser = {
      email: userData.email,
      displayName: userData.displayName,
      token: `token-${Date.now()}`, // Mock token
      userType: userData.userType,
      idCard: userData.idCard // For workers, store file name or null for customers
    };

    // Store in local array
    this.users.push(newUser);
    console.log('Users stored locally:', this.users);

    // Simulate successful registration
    this.currentUserSource.next(newUser);
    return of(newUser);
  }

  // Simulate login (check local array, handle password in values)
  login(values: any): Observable<IUser> {
    const user = this.users.find(u => u.email === values.email);
    if (user && values.password === 'mockpassword') { // Simplified mock check
      this.currentUserSource.next(user);
      return of(user);
    }
    throw new Error('Invalid credentials');
  }

  loadCurrentUser(token: string | null): Observable<void> {
    if (!token) {
      this.currentUserSource.next(null);
      return of(null);
    }

    // Simulate loading user by token (simplified for local storage)
    const user = this.users.find(u => u.token === token);
    if (user) {
      this.currentUserSource.next(user);
    }
    return of(null);
  }

  getUserAddress(): Observable<IAddress> {
    // Mock address for testing (updated to match IAddress interface)
    const mockAddress: IAddress = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipcode: '10001'
    };
    return of(mockAddress);
  }

  updateUserAddress(address: IAddress): Observable<IAddress> {
    // Mock update (optional, expand as needed)
    return of(address);
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUserSource.next(null);
    this.router.navigateByUrl('/');
  }

  // Helper method to get all stored users (for debugging)
  getStoredUsers(): IUser[] {
    return this.users;
  }
}*/
