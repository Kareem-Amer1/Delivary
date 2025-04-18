import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { AccountService } from '../account/account.service';

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
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
    currentUser$: Observable<any>;
    accountType: 'customer' | 'worker' | null = null;
    private userSubscription: Subscription;

    constructor(private accountService: AccountService) {}

    ngOnInit(): void {
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

    ngOnDestroy(): void {
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
        }
    }
}