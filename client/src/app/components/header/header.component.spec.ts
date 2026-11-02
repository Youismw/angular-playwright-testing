import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the header component', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand title QUICKTIX', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name, .brand-title')?.textContent).toContain('QUICKTIX');
  });

  it('should render default dashboard badge text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-badge')?.textContent).toContain('CORE TRACKER');
  });

  it('should switch to login variant and render topbar tag', () => {
    fixture.componentRef.setInput('variant', 'login');
    fixture.componentRef.setInput('badgeText', 'ARCHITECTURAL EDITION');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tag = compiled.querySelector('.topbar-tag');
    expect(tag).toBeTruthy();
    expect(tag?.textContent).toContain('ARCHITECTURAL EDITION');
  });

  it('should display user email and emit logout when button is clicked', () => {
    fixture.componentRef.setInput('variant', 'dashboard');
    fixture.componentRef.setInput('userEmail', 'qa.user@quicktix.test');
    fixture.componentRef.setInput('showUserActions', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const label = compiled.querySelector('.nav-user-label');
    expect(label).toBeTruthy();
    expect(label?.textContent).toContain('qa.user@quicktix.test');

    let logoutTriggered = false;
    component.logout.subscribe(() => {
      logoutTriggered = true;
    });

    const logoutBtn = compiled.querySelector('.btn-secondary') as HTMLButtonElement;
    logoutBtn.click();
    expect(logoutTriggered).toBe(true);
  });
});
