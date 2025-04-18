import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AccountService } from 'src/app/account/account.service';

// تعريف واجهة StoredUserData
interface StoredUserData {
    email: string;
    password: string;
    displayName: string;
    phoneNumber: string;
    accountType: 'customer' | 'worker';
    token: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(private accountService: AccountService, private router: Router) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> {
        return this.accountService.currentUser$.pipe(
            map(auth => {
                // لو مفيش مستخدم مسجل دخول
                if (!auth) {
                    // لو المسار مش `/orders` ولا `/checkout`، اسمح بالوصول (يعني `/shop` و `/basket` متاحين)
                    if (state.url !== '/orders' && !state.url.startsWith('/checkout')) {
                        return true;
                    }
                    // لو المسار `/orders` أو `/checkout`، وجهه لصفحة الدخول
                    this.router.navigate(['account/login'], { queryParams: { returnUrl: state.url } });
                    return false;
                }

                // لو فيه مستخدم مسجل دخول، اتأكد من نوع الحساب
                const storedUserDataString = localStorage.getItem('userData');
                if (storedUserDataString) {
                    const storedUserData: StoredUserData = JSON.parse(storedUserDataString);
                    // لو المستخدم عامل، امنعه من الوصول لـ `/shop`, `/basket`, `/checkout`
                    if (storedUserData.accountType === 'worker' ||storedUserData.accountType === null) {
                        this.router.navigate(['/']); // وجهه للـ Home
                        return false;
                    }
                }
                // لو المستخدم عميل، اسمح بالوصول
                return true;
            })
        );
    }
}