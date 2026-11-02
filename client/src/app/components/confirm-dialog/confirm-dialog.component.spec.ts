import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    component.itemTitle = 'Fix login button styling';
    fixture.detectChanges();
  });

  it('should create the confirm dialog component', () => {
    expect(component).toBeTruthy();
  });

  it('should render dialog with data-testids and item title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="confirm-dialog"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="confirm-cancel"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="confirm-accept"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Fix login button styling');
  });

  it('should emit confirm event when accept button is clicked', () => {
    let confirmed = false;
    component.confirm.subscribe(() => {
      confirmed = true;
    });

    const acceptBtn = fixture.nativeElement.querySelector('[data-testid="confirm-accept"]') as HTMLButtonElement;
    acceptBtn.click();

    expect(confirmed).toBe(true);
  });

  it('should emit cancel event when cancel button is clicked', () => {
    let cancelled = false;
    component.cancel.subscribe(() => {
      cancelled = true;
    });

    const cancelBtn = fixture.nativeElement.querySelector('[data-testid="confirm-cancel"]') as HTMLButtonElement;
    cancelBtn.click();

    expect(cancelled).toBe(true);
  });
});
