import { Component, OnInit , OnDestroy } from '@angular/core';
import { Observable,Subscription } from 'rxjs';
import { AccountService } from 'src/app/account/account.service';
import { BasketService } from 'src/app/basket/basket.service';
import { IBasket } from 'src/app/shared/models/basket';
import { IUser } from 'src/app/shared/models/user';

// تعريف واجهة StoredUserData
interface StoredUserData {
    email: string;
    password: string;
    displayName: string;
    phoneNumber: string;
    accountType: 'customer' | 'worker';
    token: string | null;
}

@Component({
    selector: 'app-nav-bar',
    templateUrl: './nav-bar.component.html',
    styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent implements OnInit, OnDestroy {
    basket$: Observable<IBasket>;
    currentUser$: Observable<IUser>;
    accountType: 'customer' | 'worker' | null = null;
    private userSubscription: Subscription;

    constructor(private basketService: BasketService, private accountService: AccountService) {}

    ngOnInit(): void {
        this.basket$ = this.basketService.basket$;
        this.currentUser$ = this.accountService.currentUser$;
        this.loadUserData();

        // مراقبة التغييرات في currentUser$
        this.userSubscription = this.currentUser$.subscribe(user => {
            if (user) {
                // لما يحصل تسجيل دخول، نحدّث accountType
                this.loadUserData();
            } else {
                // لما يحصل تسجيل خروج، نضمن إن accountType يبقى null
                this.accountType = null;
            }
        });
    }

    loadUserData() {
        const storedUserDataString = localStorage.getItem('userData');
        if (storedUserDataString) {
            const storedUserData: StoredUserData = JSON.parse(storedUserDataString);
            this.accountType = storedUserData.accountType;
        }
    }

    logout() {
        this.accountService.logout();
        this.accountType = null; // نتأكد إن accountType بـ null فورًا
    }

    ngOnDestroy(): void {
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
        }
    }
}