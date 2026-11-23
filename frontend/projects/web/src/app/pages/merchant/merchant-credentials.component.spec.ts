import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MerchantCredentialsComponent } from './merchant-credentials.component';
import { MerchantApiCredentials } from './merchant.model';
import { MerchantNotificationsService } from './merchant-notifications.service';

describe('MerchantCredentialsComponent', () => {
  let fixture: ComponentFixture<MerchantCredentialsComponent>;
  let component: MerchantCredentialsComponent;

  const credentials: MerchantApiCredentials = {
    merchantId: 'm-1',
    status: 'APPROVED',
    clientId: 'client-1',
    clientSecret: 'one-time-test-secret',
    secretAvailableOnce: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MerchantCredentialsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MerchantCredentialsComponent);
    component = fixture.componentInstance;
  });

  describe('Section A: Page Header', () => {
    it('renders the exact heading and plain-language merchant description', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('#merchant-api-credentials-title');
      expect(title).toBeTruthy();
      expect(title.textContent.trim()).toBe('API Credentials');
      expect(fixture.nativeElement.textContent).toContain(
        'Connect your online store to SwiftDrop to create and manage deliveries automatically.'
      );
      // Avoids complex technical terminology in main description
      expect(title.nextElementSibling?.textContent).not.toContain('RS256');
      expect(title.nextElementSibling?.textContent).not.toContain('OAuth 2.0');
    });
  });

  describe('Section B: Connection Status', () => {
    it('displays "Awaiting approval" when registration is pending', () => {
      fixture.componentRef.setInput('credentials', { ...credentials, status: 'PENDING' });
      fixture.detectChanges();

      expect(component.connectionStatus().status).toBe('Awaiting approval');
      expect(fixture.nativeElement.textContent).toContain('Awaiting approval');
      expect(fixture.nativeElement.textContent).toContain('Registration Pending Approval');
      expect(fixture.nativeElement.textContent).not.toContain('website is connected');
    });

    it('displays "Credentials available through secure handoff" when one-time secret is present', () => {
      fixture.componentRef.setInput('credentials', credentials);
      fixture.detectChanges();

      expect(component.connectionStatus().status).toBe('Credentials available through secure handoff');
      expect(fixture.nativeElement.textContent).toContain('Credentials available through secure handoff');
      expect(fixture.nativeElement.textContent).toContain('One-Time Credentials Ready');
    });

    it('displays "Credentials revoked or unavailable" when secret is null in view', () => {
      fixture.componentRef.setInput('credentials', { ...credentials, clientSecret: null });
      fixture.detectChanges();

      expect(component.connectionStatus().status).toBe('Credentials revoked or unavailable');
      expect(fixture.nativeElement.textContent).toContain('Credentials revoked or unavailable');
      expect(fixture.nativeElement.textContent).toContain('The secret is unavailable in this view');
    });

    it('supports displaying "Action required" status via status override', () => {
      fixture.componentRef.setInput('statusOverride', 'Action required');
      fixture.detectChanges();

      expect(component.connectionStatus().status).toBe('Action required');
      expect(fixture.nativeElement.textContent).toContain('Action required');
    });
  });

  describe('Section C: Getting Started Guide', () => {
    it('renders the complete 3-step numbered onboarding explanation with icons', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Getting Started Guide');
      expect(fixture.nativeElement.textContent).toContain('Step 1 — Get Your Credentials');
      expect(fixture.nativeElement.textContent).toContain(
        'After merchant approval, receive the OAuth Client ID and one-time Client Secret through the approved secure handoff.'
      );

      expect(fixture.nativeElement.textContent).toContain('Step 2 — Connect Your Store');
      expect(fixture.nativeElement.textContent).toContain(
        "Configure the credentials in your online store's backend application."
      );

      expect(fixture.nativeElement.textContent).toContain('Step 3 — Start Creating Deliveries');
      expect(fixture.nativeElement.textContent).toContain(
        "Use SwiftDrop's authenticated Order API to create delivery requests automatically."
      );
    });
  });

  describe('Section D: Credential Management', () => {
    it('shows the supplied OAuth credentials and asks the owner to clear them after acknowledgement', () => {
      fixture.componentRef.setInput('credentials', credentials);
      const saved = jest.fn();
      component.secretSaved.subscribe(saved);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('client-1');
      expect(fixture.nativeElement.textContent).toContain('one-time-test-secret');

      const hideBtn = fixture.nativeElement.querySelector('#hide-secret-btn') as HTMLElement;
      expect(hideBtn).toBeTruthy();
      hideBtn.click();

      expect(saved).toHaveBeenCalledTimes(1);
      expect(TestBed.inject(MerchantNotificationsService).notifications()[0].title).toBe('Client secret hidden');

      fixture.componentRef.setInput('credentials', null);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('one-time-test-secret');
    });

    it('does not retrieve or redisplay secrets when reopened without an approval response', () => {
      fixture.componentRef.setInput('credentials', credentials);
      fixture.detectChanges();
      fixture.destroy();

      fixture = TestBed.createComponent(MerchantCredentialsComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('one-time-test-secret');
      expect(fixture.nativeElement.textContent).toContain('administrator will securely hand over');
    });

    it('renders the public UI kit components with the approved status', () => {
      fixture.componentRef.setInput('credentials', credentials);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('ui-card')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('ui-status-badge').textContent).toContain('Credentials available through secure handoff');
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
      expect(fixture.nativeElement.querySelector('#clientId')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('one-time-test-secret');
    });

    it('explains unavailable secrets without claiming they have already been delivered', () => {
      fixture.componentRef.setInput('credentials', { ...credentials, clientSecret: null, secretAvailableOnce: false });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('secret is unavailable');
      expect(fixture.nativeElement.querySelector('#hide-secret-btn')).toBeNull();
    });

    it('provides copy actions with visual feedback for Client ID and Client Secret', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockImplementation(() => Promise.resolve()),
        },
      });

      fixture.componentRef.setInput('credentials', credentials);
      fixture.detectChanges();

      const copyIdBtn = fixture.nativeElement.querySelector('#copy-client-id-btn') as HTMLButtonElement;
      expect(copyIdBtn).toBeTruthy();
      copyIdBtn.click();
      fixture.detectChanges();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('client-1');
      expect(fixture.nativeElement.textContent).toContain('✓ Copied');

      const copySecretBtn = fixture.nativeElement.querySelector('#copy-client-secret-btn') as HTMLButtonElement;
      expect(copySecretBtn).toBeTruthy();
      copySecretBtn.click();
      fixture.detectChanges();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('one-time-test-secret');
    });

    it('clarifies OAuth 2.0 lifecycle and absence of independent API key generator', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('OAuth 2.0');
      expect(fixture.nativeElement.textContent).toContain('SwiftDrop never issues static API keys');
      expect(fixture.nativeElement.querySelector('#generate-api-key-btn')).toBeNull();
    });
  });

  describe('Section E: Developer Integration Guide', () => {
    it('renders an expandable section containing actual API endpoints and placeholders', () => {
      fixture.detectChanges();

      const details = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
      expect(details).toBeTruthy();
      expect(details.textContent).toContain('Developer Integration Guide');
      expect(details.textContent).toContain('POST /api/v1/auth/token');
      expect(details.textContent).toContain('POST /api/v1/merchant/orders');
      expect(details.textContent).toContain('Authorization: Bearer <access_token>');
      expect(details.textContent).toContain('Idempotency-Key: <unique-uuid>');
      expect(details.textContent).toContain('YOUR_CLIENT_ID');
      expect(details.textContent).toContain('YOUR_CLIENT_SECRET');

      // Toggling the developer guide
      const summary = fixture.nativeElement.querySelector('summary') as HTMLElement;
      summary.click();
      fixture.detectChanges();
      expect(component.isDevGuideOpen()).toBe(true);
    });

    it('omits developer guide when showTokenRequest is false (e.g. in Admin approval view)', () => {
      fixture.componentRef.setInput('showTokenRequest', false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('details')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Developer Integration Guide');
    });
  });
});
