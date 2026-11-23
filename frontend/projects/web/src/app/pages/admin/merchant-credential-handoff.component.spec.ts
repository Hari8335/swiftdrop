import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MerchantCredentialHandoffComponent } from './merchant-credential-handoff.component';
import { MerchantCredentialHandoff } from './merchant-approval.model';

describe('MerchantCredentialHandoffComponent', () => {
  let fixture: ComponentFixture<MerchantCredentialHandoffComponent>;
  let component: MerchantCredentialHandoffComponent;
  let writeText: jest.Mock;
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  const approval: MerchantCredentialHandoff = {
    merchantId: 'm-1',
    businessName: 'North Star Stores',
    clientId: 'client-abc',
    clientSecret: 'one-time-secret-xyz',
    kind: 'approval',
  };

  const render = (credentials: MerchantCredentialHandoff | null) => {
    fixture.componentRef.setInput('credentials', credentials);
    fixture.detectChanges();
  };
  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  beforeEach(async () => {
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await TestBed.configureTestingModule({ imports: [MerchantCredentialHandoffComponent] }).compileComponents();
    fixture = TestBed.createComponent(MerchantCredentialHandoffComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      delete (navigator as unknown as Record<string, unknown>)['clipboard'];
    }
  });

  it('renders nothing without credentials', () => {
    render(null);
    expect(el('#merchant-credential-handoff')).toBeNull();
  });

  it('shows the approved business, client ID, one-time secret and warning', () => {
    render(approval);
    const text = el('#merchant-credential-handoff')!.textContent!;
    expect(text).toContain('Merchant Approved — Secure Credential Handoff');
    expect(text).toContain('North Star Stores');
    expect(el('#handoff-client-id')!.textContent).toContain('client-abc');
    expect(el('#handoff-client-secret')!.textContent).toContain('one-time-secret-xyz');
    expect(text).toContain('This client secret is shown only once.');
    expect(text).toContain('Secure handoff');
  });

  it('contains no merchant integration documentation', () => {
    render(approval);
    const text = el('#merchant-credential-handoff')!.textContent!;
    for (const merchantOnly of ['Getting Started', 'Developer Integration Guide', 'curl', 'grant_type', '/api/v1/merchant/orders']) {
      expect(text).not.toContain(merchantOnly);
    }
  });

  it('copies the client ID and secret to the clipboard', async () => {
    render(approval);
    el('#handoff-copy-client-id')!.click();
    await Promise.resolve();
    fixture.detectChanges();
    expect(writeText).toHaveBeenCalledWith('client-abc');
    expect(el('#handoff-copy-client-id')!.textContent).toContain('Copied');

    el('#handoff-copy-client-secret')!.click();
    await Promise.resolve();
    fixture.detectChanges();
    expect(writeText).toHaveBeenLastCalledWith('one-time-secret-xyz');
    expect(el('#handoff-copy-client-secret')!.textContent).toContain('Copied');
  });

  it('shows a non-sensitive error when copying fails', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    render(approval);
    el('#handoff-copy-client-secret')!.click();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelectorAll('[role=alert]');
    const message = (alert[alert.length - 1] as HTMLElement).textContent!;
    expect(message).toContain('Copy failed');
    expect(message).not.toContain('one-time-secret-xyz');
  });

  it('emits done and resets copy state when the admin clicks Done', () => {
    render(approval);
    const done = jest.fn();
    component.done.subscribe(done);
    component.copied.set('clientSecret');
    el('#handoff-done')!.click();
    expect(done).toHaveBeenCalledTimes(1);
    expect(component.copied()).toBeNull();
  });

  it('explains when the response carries no secret and hides the secret copy action', () => {
    render({ ...approval, clientSecret: null });
    expect(el('#handoff-secret-unavailable')!.textContent).toContain('secret is unavailable');
    expect(el('#handoff-copy-client-secret')).toBeNull();
    expect(el('#handoff-client-secret')).toBeNull();
  });

  it('labels recovery handoffs', () => {
    render({ ...approval, kind: 'recovery' });
    expect(el('#merchant-handoff-title')!.textContent).toContain('Credentials Replaced — Secure Credential Handoff');
  });

  it('moves focus to the handoff heading for keyboard users', () => {
    render(approval);
    component.ngAfterViewInit();
    expect(document.activeElement?.id).toBe('merchant-handoff-title');
  });
});
