import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../account.service';
import { IUser } from '../../shared/models/user';

// تعريف واجهة للبيانات المرسلة للتسجيل الدخول
interface LoginData {
    email: string;
    password: string;
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
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
    loginForm: FormGroup;
    returnUrl: string;
    accountType: string = 'customer'; // الافتراضي: عميل
    errors: string[] = []; // متغير لتخزين رسائل الخطأ

    constructor(
        private accountService: AccountService,
        private router: Router,
        private activatedRoute: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.returnUrl = this.activatedRoute.snapshot.queryParams.returnUrl || '/shop';
        this.createLoginForm();
    }

    createLoginForm() {
        this.loginForm = new FormGroup({
            email: new FormControl('', [Validators.required, Validators.pattern('^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$')]),
            password: new FormControl('', Validators.required),
            accountType: new FormControl(this.accountType)
        });
    }

    setAccountType(type: string) {
        this.accountType = type;
        this.loginForm.patchValue({ accountType: type });
    }

    onSubmit() {
        if (this.loginForm.invalid) {
            this.errors = ['Please fill out all required fields correctly.'];
            return;
        }

        this.errors = []; // إعادة تعيين الأخطاء

        const loginData: LoginData = {
            email: this.loginForm.get('email')?.value,
            password: this.loginForm.get('password')?.value,
            accountType: this.loginForm.get('accountType')?.value
        };

        // التحقق من الحساب المخزن في Local Storage (userData)
        const storedUserDataString = localStorage.getItem('userData');
        if (storedUserDataString) {
            const storedUserData: StoredUserData = JSON.parse(storedUserDataString);

            // التحقق من تطابق البيانات مع الحساب المخزن
            if (
                storedUserData.email === loginData.email &&
                storedUserData.password === loginData.password &&
                storedUserData.accountType.toLowerCase() === loginData.accountType.toLowerCase()
            ) {
                // إذا تم العثور على حساب متطابق
                const userForCurrentUser: IUser = {
                    email: storedUserData.email,
                    displayName: storedUserData.displayName,
                    token: storedUserData.token || 'fake-token' // إذا مفيش Token، نستخدم Token وهمي
                };
                this.accountService.updateCurrentUser(userForCurrentUser);
                this.router.navigateByUrl(this.returnUrl);
                return;
            }
        }

        // لو مفيش حساب متطابق في userData، نجرب الـ API
        this.accountService.login(loginData).subscribe({
            next: (user: IUser | null) => {
                if (user) {
                    // إذا الـ API نجحت وأرجعت مستخدم
                    this.accountService.updateCurrentUser(user);
                    this.router.navigateByUrl(this.returnUrl);
                } else {
                    this.errors = ['Invalid email, password, or account type.'];
                }
            },
            error: (error) => {
                console.error('Login error:', error);
                this.errors = error.errors || ['Invalid email, password, or account type.'];
            }
        });
    }
}