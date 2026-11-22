import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MerchantCredentialsComponent } from './merchant-credentials.component';
import { MerchantApiCredentials } from './merchant.model';
import { MerchantNotificationsService } from './merchant-notifications.service';

describe('MerchantCredentialsComponent', () => {
  let fixture: ComponentFixture<MerchantCredentialsComponent>;
  const credentials: MerchantApiCredentials = {
    merchantId: 'm-1', status: 'APPROVED', clientId: 'client-1',
    clientSecret: 'one-time-test-secret', secretAvailableOnce: true,
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MerchantCredentialsComponent] }).compileComponents();
    fixture = TestBed.createComponent(MerchantCredentialsComponent);
  });

  it('shows the supplied OAuth credentials and asks the owner to clear them after acknowledgement', () => {
    fixture.componentRef.setInput('credentials', credentials);
    const saved = jest.fn();
    fixture.componentInstance.secretSaved.subscribe(saved);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('client-1');
    expect(fixture.nativeElement.textContent).toContain('one-time-test-secret');
    const buttons = fixture.nativeElement.querySelectorAll('button');
    (buttons[buttons.length - 1] as HTMLButtonElement).click();
    expect(saved).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(MerchantNotificationsService).notifications()[0].title).toBe('Client secret hidden');
    fixture.componentRef.setInput('credentials', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('one-time-test-secret');
  });

  it('shows a compact merchant guide without redisplaying an approval secret', () => {
    fixture.componentRef.setInput('credentials', credentials);
    fixture.detectChanges();
    fixture.destroy();
    fixture = TestBed.createComponent(MerchantCredentialsComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.textContent).not.toContain('one-time-test-secret');
    expect(page.textContent).not.toContain('APPROVED');
    expect(page.querySelectorAll('ui-card')).toHaveLength(1);
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('API Credentials');
    expect(page.textContent).toContain('POST /api/v1/auth/token');
    expect(page.textContent).toContain('grant_type=client_credentials');
    expect(page.textContent).toContain('Authorization: Bearer <access-token>');
    expect(page.textContent).toContain('notification bell within 24 hours');
  });

  it('renders the public UI kit components with the approved status', () => {
    fixture.componentRef.setInput('credentials', credentials);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ui-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('ui-status-badge').textContent).toContain('APPROVED');
    expect(fixture.nativeElement.querySelector('ui-button')).toBeTruthy();
  });

  it('uses the shared integration content width and responsive credential grid', () => {
    fixture.componentRef.setInput('credentials', credentials);
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('[aria-labelledby="merchant-api-credentials-title"]') as HTMLElement;
    const credentialGrid = fixture.nativeElement.querySelector('#clientId')?.closest('.grid') as HTMLElement;
    expect(section.classList.contains('max-w-7xl')).toBe(true);
    expect(credentialGrid.classList.contains('xl:grid-cols-2')).toBe(true);
  });

  it('shows pending approval without exposing credentials', () => {
    fixture.componentRef.setInput('credentials', { ...credentials, status: 'PENDING' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('awaiting administrator approval');
    expect(fixture.nativeElement.querySelector('ui-status-badge').textContent).toContain('PENDING');
    expect(fixture.nativeElement.textContent).not.toContain('one-time-test-secret');
    expect(fixture.nativeElement.querySelector('#clientId')).toBeNull();
  });

  it('explains unavailable secrets without claiming they have already been delivered', () => {
    fixture.componentRef.setInput('credentials', { ...credentials, clientSecret: null, secretAvailableOnce: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('secret is unavailable');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
