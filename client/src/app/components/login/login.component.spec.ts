import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { vi } from 'vitest';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: any;
  let routerSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      isAuthenticated: vi.fn().mockReturnValue(false),
      login: vi.fn().mockReturnValue(of({ token: 'mock-jwt-token' })),
    };

    routerSpy = {
      navigate: vi.fn().mockReturnValue(Promise.resolve(true)),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, FormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should render email and password inputs with correct testids', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="login-email"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="login-password"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="login-submit"]')).toBeTruthy();
  });

  it('should fill demo credentials when fill button is clicked', () => {
    component.fillDemoCredentials();
    expect(component.email).toBe('qa.user@quicktix.test');
    expect(component.password).toBe('Passw0rd!test');
  });

  it('should call authService.login on valid submit and navigate to /tickets', () => {
    authServiceSpy.login = vi.fn().mockReturnValue(of({ token: 'test-token' }));

    component.email = 'qa.user@quicktix.test';
    component.password = 'Passw0rd!test';
    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith('qa.user@quicktix.test', 'Passw0rd!test');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tickets']);
    expect(component.loading()).toBe(false);
  });

  it('should display error message on login failure', () => {
    authServiceSpy.login = vi.fn().mockReturnValue(
      throwError(() => ({
        status: 401,
        error: { message: 'Invalid email or password' },
      }))
    );

    component.email = 'wrong@email.com';
    component.password = 'badpass';
    component.onSubmit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Invalid email or password');
    const compiled = fixture.nativeElement as HTMLElement;
    const errorAlert = compiled.querySelector('[data-testid="login-error"]');
    expect(errorAlert).toBeTruthy();
    expect(errorAlert?.textContent).toContain('Invalid email or password');
  });
});
