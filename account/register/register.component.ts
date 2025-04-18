import { Component, OnInit } from '@angular/core';
import { AsyncValidatorFn, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AccountService } from '../account.service';
import { IUser } from '../../shared/models/user';

// تعريف واجهة للبيانات المرسلة للتسجيل
interface RegisterData {
    displayName: string;
    email: string;
    phoneNumber: string;
    password: string;
    idCardPhoto?: File; // اختياري للعامل فقط
    accountType: 'customer' | 'worker';
}

// تعريف واجهة للبيانات المخزنة في Local Storage
interface StoredUserData {
    email: string;
    password: string;
    displayName: string;
    phoneNumber: string;
    accountType: 'customer' | 'worker';
    token: string | null;
}

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
    // تعريف الـ Form ومتغيرات الحالة
    registerForm: FormGroup;
    errors: string[];
    accountType: 'customer' | 'worker' = 'customer'; // الافتراضي: عميل (حددنا النوع بدقة)
    idCardPhoto: File | null = null; // لتخزين الصورة المرفوعة
    idCardPhotoError: boolean = false; // لعرض رسالة خطأ لو ما رفعش الصورة

    constructor(private fb: FormBuilder, private accountService: AccountService, private router: Router) { }

    // تهيئة الـ Form لما الكومبوننت يتحمل
    ngOnInit(): void {
        this.createRegisterForm();
    }

    // إنشاء الـ Form بناءً على نوع الحساب
    createRegisterForm() {
        // تعريف الـ Validators المشتركة
        const displayName = [null, [Validators.required]];
        const email = [null, [Validators.required, Validators.pattern('^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$')], [this.validateEmailNotTaken()]];
        const phoneNumber = [null, [Validators.required, Validators.pattern('^\\d{11}$')], [this.validatePhoneNumberNotTaken()]]; // إضافة Pattern لـ 11 رقم
        const password = [null, [Validators.required, this.passwordStrengthValidator()]];

        // إنشاء الـ Form حسب نوع الحساب
        if (this.accountType === 'customer') {
            // Form للعميل (بدون حقل الصورة)
            this.registerForm = this.fb.group({
                displayName,
                email,
                phoneNumber,
                password
            });
        } else {
            // Form للعامل (مع حقل الصورة)
            this.registerForm = this.fb.group({
                displayName,
                email,
                phoneNumber,
                password
            });
        }
    }

    // تحديد نوع الحساب عند الضغط على الزر
    setAccountType(type: 'customer' | 'worker') {
        // تعيين نوع الحساب (customer أو worker)
        this.accountType = type;
        // إعادة إنشاء الـ Form بناءً على النوع
        this.createRegisterForm();
        // إعادة تعيين القيم والأخطاء
        this.registerForm.reset();
        this.idCardPhoto = null;
        this.idCardPhotoError = false;
    }

    // معالجة رفع الصورة للعامل
    onFileChange(event: Event) {
        // الحصول على الملف المرفوع من الـ Input
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.idCardPhoto = input.files[0];
            this.idCardPhotoError = false; // إخفاء رسالة الخطأ لو رفع صورة
        }
    }

    // التحقق من قوة الـ Password (3 أحرف و2 أرقام)
    passwordStrengthValidator(): ValidatorFn {
        return (control) => {
            if (!control.value) {
                return null;
            }
            const hasLetters = (control.value.match(/[a-zA-Z]/g) || []).length >= 3;
            const hasNumbers = (control.value.match(/[0-9]/g) || []).length >= 2;
            return hasLetters && hasNumbers ? null : { passwordStrength: true };
        };
    }

    // التحقق من طول الرقم (11 رقم فقط)
    validatePhoneLength(): ValidatorFn {
        return (control) => {
            if (!control.value) {
                return null;
            }
            const value = control.value.toString().replace(/\D/g, '').trim(); // إزالة أي حروف أو رموز ومسافات
            console.log('Phone Number Value (cleaned and trimmed):', value); // طباعة للتحقق
            const isValidLength = value.length === 11;
            return isValidLength ? null : { invalidLength: true };
        };
    }

    // التحقق من تكرار الإيميل مع طباعة ومعالجة الأخطاء، بدون تأخير
    validateEmailNotTaken(): AsyncValidatorFn {
      return control => {
          return of(null).pipe(
              switchMap(() => {
                  if (!control.value) return of(null);
                  console.log('Checking email:', control.value);
  
                  // تحقق محلي من Local Storage (userData) - يمكن إزالته لاحقًا
                  let localCheckResult = null;
                  const storedUserDataString = localStorage.getItem('userData');
                  if (storedUserDataString) {
                      const storedUserData: StoredUserData = JSON.parse(storedUserDataString);
                      if (storedUserData.email === control.value) {
                          localCheckResult = { emailExists: true };
                      }
                  }
  
                  // تحقق من الـ API (بدون تعديل)
                  return this.accountService.checkEmailExists(control.value).pipe(
                      map(res => {
                          console.log('Email exists response:', res);
                          return res === true ? { emailExists: true } : localCheckResult; // استخدام التحقق المحلي كـ Fallback
                      }),
                      catchError(() => {
                          console.log('Error checking email or API not available, using local check:', control.value);
                          return of(localCheckResult); // إرجاع التحقق المحلي لو الـ API فشلت
                      })
                  );
              })
          );
      };
  }
    /*validateEmailNotTaken(): AsyncValidatorFn {
        return control => {
            return of(null).pipe(
                switchMap(() => {
                    if (!control.value) {
                        return of(null);
                    }
                    console.log('Checking email:', control.value); // طباعة للتحقق
                    return this.accountService.checkEmailExists(control.value).pipe(
                        map(res => {
                            console.log('Email exists response:', res); // طباعة للتحقق
                            return res === false || res === null ? null : { emailExists: true }; // Logic صحيح
                        }),
                        catchError(() => {
                            console.log('Error checking email:', control.value); // طباعة للأخطاء
                            return of(null); // رجوع null لو فيه خطأ
                        })
                    );
                })
            );
        };
    }*/

    // التحقق من تكرار الرقم (زي الإيميل) مع طباعة ومعالجة الأخطاء، بدون تأخير
    /*validatePhoneNumberNotTaken(): AsyncValidatorFn {
        return control => {
            return of(null).pipe(
                switchMap(() => {
                    if (!control.value) {
                        return of(null);
                    }
                    console.log('Checking phone number:', control.value); // طباعة للتحقق
                    return this.accountService.checkPhoneNumberExists(control.value).pipe(
                        map(res => {
                            console.log('Phone number exists response:', res); // طباعة للتحقق
                            return res === false || res === null ? null : { phoneNumberExists: true }; // نفس Logic الإيميل
                        }),
                        catchError(() => {
                            console.log('Error checking phone number:', control.value); // طباعة للأخطاء
                            return of(null); // رجوع null لو فيه خطأ
                        })
                    );
                })
            );
        };
    }*/
        validatePhoneNumberNotTaken(): AsyncValidatorFn {
          return control => {
              return of(null).pipe(
                  switchMap(() => {
                      if (!control.value) return of(null);
                      console.log('Checking phone number:', control.value);
      
                      // تحقق محلي من Local Storage (userData) - يمكن إزالته لاحقًا
                      let localCheckResult = null;
                      const storedUserDataString = localStorage.getItem('userData');
                      if (storedUserDataString) {
                          const storedUserData: StoredUserData = JSON.parse(storedUserDataString);
                          if (storedUserData.phoneNumber === control.value) {
                              localCheckResult = { phoneNumberExists: true };
                          }
                      }
      
                      // تحقق من الـ API (بدون تعديل)
                      return this.accountService.checkPhoneNumberExists(control.value).pipe(
                          map(res => {
                              console.log('Phone number exists response:', res);
                              return res === true ? { phoneNumberExists: true } : localCheckResult; // استخدام التحقق المحلي كـ Fallback
                          }),
                          catchError(() => {
                              console.log('Error checking phone number or API not available, using local check:', control.value);
                              return of(localCheckResult); // إرجاع التحقق المحلي لو الـ API فشلت
                          })
                      );
                  })
              );
          };
      }

    // إرسال بيانات التسجيل وتخزينها في Local Storage
    onSubmit() {
      if (this.registerForm.invalid) {
        return;
      }
    
      const formData = new FormData();
      formData.append('displayName', this.registerForm.get('displayName')?.value);
      formData.append('email', this.registerForm.get('email')?.value);
      formData.append('phoneNumber', this.registerForm.get('phoneNumber')?.value);
      formData.append('password', this.registerForm.get('password')?.value);
      formData.append('accountType', this.accountType);
    
      if (this.accountType === 'worker' && this.idCardPhoto) {
        formData.append('idCardPhoto', this.idCardPhoto);
      }
    
      this.accountService.register(formData).subscribe((response: IUser | null) => {
        // إنشاء بيانات المستخدم بناءً على الفورم
        const userData: StoredUserData = {
          email: this.registerForm.get('email')?.value,
          password: this.registerForm.get('password')?.value,
          displayName: this.registerForm.get('displayName')?.value,
          phoneNumber: this.registerForm.get('phoneNumber')?.value,
          accountType: this.accountType as 'customer' | 'worker',
          token: response?.token || null
        };
    
        // حفظ البيانات في Local Storage
        localStorage.setItem('userData', JSON.stringify(userData));
    
        // تحديث currentUser$ حتى لو الـ API فشلت
        const userForCurrentUser: IUser = {
          email: userData.email,
          displayName: userData.displayName,
          token: userData.token,
          // أضف أي حقول إضافية مطلوبة بناءً على واجهة IUser
        };
        this.accountService.updateCurrentUser(userForCurrentUser);
    
        // التوجيه لـ /shop
        this.router.navigateByUrl('/shop');
      }, error => {
        console.log(error);
        this.errors = error.errors || ['Registration failed'];
      });
    }
}




/*
import { Component, OnInit } from '@angular/core';
import { AsyncValidatorFn, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AccountService } from '../account.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  errors: string[];

  constructor(private fb: FormBuilder, private accountService: AccountService, private router: Router) { }

  ngOnInit(): void {
    this.createRegisterForm();
  }

  createRegisterForm() {
    this.registerForm = this.fb.group({
      displayName: [null, [Validators.required]],
      email: [null, 
        [Validators.required, Validators
        .pattern('^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$')],
        [this.validateEmailNotTaken()]
      ],
      password: [null, Validators.required]
    });
  }

  onSubmit() {
    this.accountService.register(this.registerForm.value).subscribe(response => {
      this.router.navigateByUrl('/shop');
    }, error => {
      console.log(error);
      this.errors = error.errors;
    })
  }

  validateEmailNotTaken(): AsyncValidatorFn {
    return control => {
      return timer(500).pipe(
        switchMap(() => {
          if (!control.value) {
            return of(null);
          }
          return this.accountService.checkEmailExists(control.value).pipe(
            map(res => {
               return res ? {emailExists: true} : null;
            })
          );
        })
      )
    }
  }

}
*/


/*// src/app/account/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AccountService } from '../account.service';
import { of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  errors: string[] = []; // Ensure this property exists
  userType: string = 'customer'; // Default to customer

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      if (segments.some(segment => segment.path === 'worker')) {
        this.userType = 'worker';
      } else {
        this.userType = 'customer';
      }
      this.createRegisterForm();
    });
  }

  createRegisterForm() {
    if (this.userType === 'customer') {
      this.registerForm = this.fb.group({
        displayName: [null, [Validators.required]],
        email: [null, [
          Validators.required,
          Validators.email
        ], [this.validateEmailNotTaken()]], // Email uniqueness check
        phoneNumber: [null, [
          Validators.required,
          Validators.pattern('^[0-9]{11}$') // 11 digits for phone
        ], [this.validatePhoneNotTaken()]], // Phone number uniqueness check
        password: [null, [Validators.required, Validators.pattern('^(?=.*\d).{7,}$')]] // 7+ chars with numbers
      });
    } else if (this.userType === 'worker') {
      this.registerForm = this.fb.group({
        displayName: [null, [Validators.required]],
        email: [null, [
          Validators.required,
          Validators.email
        ], [this.validateEmailNotTaken()]], // Email uniqueness check
        phoneNumber: [null, [
          Validators.required,
          Validators.pattern('^[0-9]{11}$') // 11 digits for phone
        ], [this.validatePhoneNotTaken()]], // Phone number uniqueness check
        password: [null, [Validators.required, Validators.pattern('^(?=.*\d).{7,}$')]], // 7+ chars with numbers
        idCard: [null, [Validators.required]] // For file upload
      });
    }
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const formData = new FormData();
      Object.keys(this.registerForm.value).forEach(key => {
        if (key === 'idCard' && this.registerForm.value.idCard) {
          formData.append(key, this.registerForm.value.idCard, this.registerForm.value.idCard.name);
        } else {
          formData.append(key, this.registerForm.value[key]);
        }
      });
      formData.append('userType', this.userType);

      // Log FormData for debugging
      const formDataEntries: { [key: string]: any } = {};
      formData.forEach((value, key) => {
        formDataEntries[key] = value;
      });
      console.log('Form Data being sent:', formDataEntries);

      this.accountService.register(formData).subscribe({
        next: (user) => {
          console.log('User registered locally:', user);
          this.router.navigateByUrl('/shop');
        },
        error: (error) => {
          console.error('Registration error:', error);
          this.errors = [error.message || 'Registration failed'];
        }
      });
    } else {
      console.log('Form is invalid:', this.registerForm.errors);
      this.errors = ['Please fill out all required fields correctly.'];
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        this.registerForm.patchValue({ idCard: file });
        this.registerForm.get('idCard')?.updateValueAndValidity();
      } else {
        this.errors = ['Please upload an image or PDF file only.'];
        this.registerForm.patchValue({ idCard: null });
      }
    }
  }

  goToRegister(userType: string) {
    this.userType = userType;
    this.router.navigate(['../', userType], { relativeTo: this.route }).then(success => {
      if (success) {
        this.createRegisterForm();
      }
    });
  }

  validateEmailNotTaken(): any {
    return (control) => {
      return timer(500).pipe(
        switchMap(() => {
          if (!control.value) return of(null);
          const emailExists = this.accountService.getStoredUsers().some(user => user.email === control.value);
          return of(emailExists ? { emailExists: true } : null);
        })
      );
    };
  }

  validatePhoneNotTaken(): any {
    return (control) => {
      return timer(500).pipe(
        switchMap(() => {
          if (!control.value) return of(null);
          const phoneExists = this.accountService.getStoredUsers().some(user => user.phoneNumber === control.value);
          return of(phoneExists ? { phoneExists: true } : null);
        })
      );
    };
  }
}*/