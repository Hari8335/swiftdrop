import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { MerchantApprovalComponent } from './merchant-approval.component';
import { MerchantApprovalService } from './merchant-approval.service';
import { MerchantSummary } from './merchant-approval.model';

describe('MerchantApprovalComponent', () => {
  let component: MerchantApprovalComponent;
  let fixture: ComponentFixture<MerchantApprovalComponent>;
  let service: {
    merchants: jest.Mock;
    totalElements: jest.Mock;
    totalPages: jest.Mock;
    currentPage: jest.Mock;
    pageSize: jest.Mock;
    loading: jest.Mock;
    error: jest.Mock;
    refresh: jest.Mock;
    loadMerchants: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
    sendCredentialsEmail: jest.Mock;
    messageFor: jest.Mock;
    pendingCount: jest.Mock;
    loadPendingCount: jest.Mock;
    recover?: jest.Mock;
    suspend?: jest.Mock;
    reactivate?: jest.Mock;
  };
  const merchant: MerchantSummary = {
    id: 'm-1',
    businessName: 'North Star Stores',
    contactName: 'Asha Perera',
    email: 'asha@example.test',
    phoneNumber: '+94771234567',
    status: 'PENDING',
    rejectionReason: null,
    createdAt: '2026-11-01T10:00:00Z',
  };

  beforeEach(async () => {
    service = {
      merchants: jest.fn().mockReturnValue([merchant]),
      totalElements: jest.fn().mockReturnValue(1),
      totalPages: jest.fn().mockReturnValue(1),
      currentPage: jest.fn().mockReturnValue(0),
      pageSize: jest.fn().mockReturnValue(20),
      loading: jest.fn().mockReturnValue(false),
      error: jest.fn().mockReturnValue(null),
      refresh: jest.fn().mockReturnValue(of({ content: [merchant], totalElements: 1, totalPages: 1, page: 0, size: 20 })),
      loadMerchants: jest.fn().mockReturnValue(of({ content: [merchant], totalElements: 1, totalPages: 1, page: 0, size: 20 })),
      approve: jest.fn().mockReturnValue(of({ merchant: { ...merchant, status: 'APPROVED' }, clientId: 'client-1' })),
      reject: jest.fn().mockReturnValue(of({ ...merchant, status: 'REJECTED', rejectionReason: 'Not verified' })),
      sendCredentialsEmail: jest.fn().mockReturnValue(of(void 0)),
      messageFor: jest.fn().mockReturnValue('Action failed'),
      pendingCount: jest.fn().mockReturnValue(1),
      loadPendingCount: jest.fn().mockReturnValue(of(1)),
    };

    await TestBed.configureTestingModule({
      imports: [MerchantApprovalComponent],
      providers: [provideRouter([]), { provide: MerchantApprovalService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(MerchantApprovalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads and displays pending merchants', () => {
    expect(service.refresh).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('North Star Stores');
    expect(fixture.nativeElement.textContent).toContain('Pending');
  });

  it('automatically defaults to approved merchants when there are no pending merchant requests', () => {
    service.refresh.mockReturnValueOnce(of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }));
    component.reload();
    expect(component.listStatus()).toBe('APPROVED');
    expect(service.loadMerchants).toHaveBeenCalledWith(0, 20, 'APPROVED');
  });

  it('requires explicit recovery confirmation and preserves its key after a lost response', () => {
    const pending={...merchant,credentialRecoveryAvailable:true};
    service.recover=jest.fn().mockReturnValueOnce(throwError(()=>({status:502})))
      .mockReturnValueOnce(of({merchant:{...pending,status:'APPROVED'},clientId:'same-client',clientSecret:'replacement-only-once'}));
    component.openRecover(pending); component.confirmAction();
    expect(service.recover).not.toHaveBeenCalled();
    expect(component.reasonError()).toContain('Confirm replacement');
    component.confirmReplacement.set(true); component.confirmAction();
    const key=service.recover.mock.calls[0][1];
    component.confirmAction();
    expect(service.recover).toHaveBeenLastCalledWith(merchant.id,key);
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('replacement-only-once');
    component.openRecover(pending); expect(component.action()).toBeNull();
    fixture.destroy(); expect(component.handoff()).toBeNull();
  });

  it('offers recovery for approved merchants and keeps explicit status filtering', () => {
    service.recover=jest.fn();
    component.changeStatus('APPROVED');
    expect(service.loadMerchants).toHaveBeenCalledWith(0,20,'APPROVED');
    component.openRecover({...merchant,status:'APPROVED',credentialRecoveryAvailable:true});
    expect(component.action()).toBe('recover');
    expect(component.confirmReplacement()).toBe(false);
  });

  it('displays approval credentials once, retains them across list refresh, and clears them on acknowledgement', () => {
    service.approve.mockReturnValueOnce(of({ merchant: { ...merchant, status: 'APPROVED' },
      clientId: 'client-1', clientSecret: 'one-time-test-secret' }));
    component.openApprove(merchant);
    component.confirmAction();
    fixture.detectChanges();
    expect(component.feedback()).toContain('APPROVED');
    expect(fixture.nativeElement.textContent).toContain('one-time-test-secret');
    expect(fixture.nativeElement.textContent).toContain('Merchant Approved — Secure Credential Handoff');
    expect(fixture.nativeElement.querySelector('#merchant-credential-handoff').textContent).toContain('North Star Stores');
    component.reload();
    component.openApprove({ ...merchant, id: 'm-2' });
    expect(component.action()).toBeNull();
    expect(service.approve).toHaveBeenCalledTimes(1);
    (fixture.nativeElement.querySelector('#handoff-done') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.handoff()).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('one-time-test-secret');
    component.openApprove({ ...merchant, id: 'm-2' });
    expect(component.action()).toBe('approve');
  });

  it('clears the secret when leaving the page and never recovers it from the merchant list', () => {
    service.approve.mockReturnValueOnce(of({ merchant: { ...merchant, status: 'APPROVED' },
      clientId: 'client-1', clientSecret: 'one-time-test-secret' }));
    component.openApprove(merchant);
    component.confirmAction();
    fixture.destroy();
    expect(component.handoff()).toBeNull();
    fixture = TestBed.createComponent(MerchantApprovalComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('one-time-test-secret');
  });

  it('does not retain a late approval response after leaving the page', () => {
    const response = new Subject<{ merchant: MerchantSummary; clientId: string; clientSecret: string }>();
    service.approve.mockReturnValueOnce(response);
    component.openApprove(merchant);
    component.confirmAction();
    fixture.destroy();
    response.next({ merchant: { ...merchant, status: 'APPROVED' },
      clientId: 'client-1', clientSecret: 'late-test-secret' });
    response.complete();
    expect(component.handoff()).toBeNull();
  });

  it('allows closing an approval response with no optional secret', () => {
    component.openApprove(merchant);
    component.confirmAction();
    fixture.detectChanges();
    expect(component.handoff()?.clientSecret).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('secret is unavailable');
    (fixture.nativeElement.querySelector('#handoff-done') as HTMLButtonElement).click();
    expect(component.handoff()).toBeNull();
    component.openApprove({ ...merchant, id: 'm-2' });
    expect(component.action()).toBe('approve');
  });

  it('blocks an empty rejection reason', () => {
    component.openReject(merchant);
    component.confirmAction();
    expect(service.reject).not.toHaveBeenCalled();
    expect(component.reasonError()).toBe('Enter a rejection reason.');
  });

  it('sends a trimmed rejection reason and refreshes after success', () => {
    component.openReject(merchant);
    component.reason.set('  Not verified  ');
    component.confirmAction();
    expect(service.reject).toHaveBeenCalledWith('m-1', { reason: 'Not verified' });
    expect(service.refresh).toHaveBeenCalledTimes(2);
    expect(component.feedback()).toContain('REJECTED');
  });

  it('prevents approval when the merchant is no longer pending', () => {
    component.openApprove({ ...merchant, status: 'APPROVED' });
    expect(component.action()).toBeNull();
    expect(service.approve).not.toHaveBeenCalled();
  });

  it('prevents conflicting rejection actions during submission or credential handoff', () => {
    component.isSubmitting.set(true);
    component.openReject(merchant);
    expect(component.action()).toBeNull();

    component.isSubmitting.set(false);
    component.handoff.set({
      merchantId: merchant.id,
      businessName: merchant.businessName,
      clientId: 'client-1',
      clientSecret: 'one-time-test-secret',
      kind: 'approval',
    });
    component.openReject(merchant);
    expect(component.action()).toBeNull();
  });

  it('cancels a pending rejection when leaving the page', () => {
    const response = new Subject<MerchantSummary>();
    service.reject.mockReturnValueOnce(response);
    component.openReject(merchant);
    component.reason.set('Not verified');
    component.confirmAction();
    fixture.destroy();

    response.next({ ...merchant, status: 'REJECTED', rejectionReason: 'Not verified' });
    response.complete();

    expect(component.feedback()).toBeNull();
  });

  it('shows action errors and releases the submit lock', () => {
    service.approve.mockReturnValueOnce(throwError(() => ({ status: 409 })));
    component.openApprove(merchant);
    component.confirmAction();
    expect(component.isSubmitting()).toBe(false);
    expect(component.reasonError()).toBe('Action failed');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Action failed');
    expect(component.handoff()).toBeNull();
  });

  it('renders only one modal dialog when approving a merchant without overlapping details modal', () => {
    component.openApprove(merchant);
    fixture.detectChanges();

    const dialogs = fixture.nativeElement.querySelectorAll('section[role="dialog"]');
    expect(dialogs.length).toBe(1);
    expect(fixture.nativeElement.querySelector('#merchant-details-title')).toBeNull();
    expect(fixture.nativeElement.querySelector('#approve-merchant-title')).toBeTruthy();
  });

  describe('admin-focused layout', () => {
    const text = () => fixture.nativeElement.textContent as string;

    it('renders the admin header with subtitle and pending count', () => {
      expect(text()).toContain('Merchant Approvals');
      expect(text()).toContain('Review merchant registrations, manage approval decisions, and securely hand over integration credentials.');
      expect(service.loadPendingCount).toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('#merchant-pending-count').textContent).toContain('1 pending review');
    });

    it('does not render merchant-facing integration documentation', () => {
      expect(fixture.nativeElement.querySelector('app-merchant-credentials')).toBeNull();
      for (const merchantOnly of ['Getting Started Guide', 'Developer Integration Guide', 'Connect Your Store', 'curl', 'grant_type', 'Integration Status']) {
        expect(text()).not.toContain(merchantOnly);
      }
    });

    it('does not render merchant documentation below the handoff after approval', () => {
      service.approve.mockReturnValueOnce(of({ merchant: { ...merchant, status: 'APPROVED' }, clientId: 'client-1', clientSecret: 'one-time-test-secret' }));
      component.openApprove(merchant);
      component.confirmAction();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#merchant-credential-handoff')).toBeTruthy();
      expect(text()).not.toContain('Developer Integration Guide');
      expect(text()).not.toContain('Getting Started Guide');
    });

    it('keeps concise admin-only guidance available', () => {
      const guide = fixture.nativeElement.querySelector('#merchant-admin-guide');
      expect(guide.textContent).toContain('Reviewing applications');
      expect(guide.textContent).toContain('Recovery and replacement');
      expect(guide.textContent).toContain('Rejection and suspension');
    });
  });

  describe('status filtering', () => {
    it('offers every contract status plus all merchants', () => {
      const options = Array.from(fixture.nativeElement.querySelectorAll('#merchant-list-status option')) as HTMLOptionElement[];
      expect(options.map((o) => o.value)).toEqual(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ALL']);
    });

    it('loads rejected and all merchants from the backend filter', () => {
      component.changeStatus('REJECTED');
      expect(service.loadMerchants).toHaveBeenCalledWith(0, 20, 'REJECTED');
      component.changeStatus('ALL');
      expect(service.loadMerchants).toHaveBeenCalledWith(0, 20, 'ALL');
      expect(component.listStatus()).toBe('ALL');
    });

    it('shows a filter-specific empty state', () => {
      service.merchants.mockReturnValue([]);
      component.listStatus.set('REJECTED');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#merchant-approval-empty').textContent).toContain('No rejected applications found.');
    });

    it('shows a meaningful load error with retry', () => {
      service.error.mockReturnValue('Merchants could not be loaded.');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#merchant-approval-error').textContent).toContain('Merchants could not be loaded.');
      (fixture.nativeElement.querySelector('#merchant-approval-retry') as HTMLButtonElement).click();
      expect(service.refresh).toHaveBeenCalledTimes(2);
    });
  });

  describe('status-appropriate actions', () => {
    const buttonLabels = () => Array.from(fixture.nativeElement.querySelectorAll('table button') as NodeListOf<HTMLButtonElement>)
      .map((b) => b.textContent!.trim());

    it('shows only Details for rejected merchants', () => {
      service.merchants.mockReturnValue([{ ...merchant, status: 'REJECTED', rejectionReason: 'Unverified' }]);
      fixture.detectChanges();
      expect(buttonLabels()).toEqual(['Details']);
    });

    it('shows suspend and recovery for approved merchants but never approve', () => {
      service.merchants.mockReturnValue([{ ...merchant, status: 'APPROVED', credentialRecoveryAvailable: true }]);
      fixture.detectChanges();
      expect(buttonLabels()).toEqual(['Details', 'Suspend', 'Recover credentials']);
    });

    it('shows reactivate for suspended merchants', () => {
      service.merchants.mockReturnValue([{ ...merchant, status: 'SUSPENDED' }]);
      fixture.detectChanges();
      expect(buttonLabels()).toEqual(['Details', 'Reactivate']);
    });

    it('blocks invalid transitions even when called directly', () => {
      component.openStatusAction({ ...merchant, status: 'REJECTED' }, 'suspend');
      component.openStatusAction({ ...merchant, status: 'APPROVED' }, 'reactivate');
      component.openReject({ ...merchant, status: 'REJECTED' });
      component.openRecover({ ...merchant, status: 'REJECTED', credentialRecoveryAvailable: true });
      expect(component.action()).toBeNull();
    });
  });

  describe('merchant details', () => {
    it('shows available fields with readable fallbacks and credential status', () => {
      component.openDetails({ ...merchant, phoneNumber: '', status: 'APPROVED', credentialRecoveryAvailable: true });
      fixture.detectChanges();
      const dialog = fixture.nativeElement.querySelector('section[role="dialog"]');
      expect(dialog.textContent).toContain('North Star Stores');
      expect(dialog.textContent).toContain('m-1');
      expect(dialog.textContent).toContain('Not provided');
      expect(dialog.querySelector('#merchant-details-credential-status').textContent).toContain('recovery is available');
      expect(dialog.textContent).not.toContain('Rejection reason');
    });

    it('shows the rejection reason for rejected merchants', () => {
      component.openDetails({ ...merchant, status: 'REJECTED', rejectionReason: 'Documents could not be verified' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('section[role="dialog"]').textContent).toContain('Documents could not be verified');
    });

    it('closes details and confirmation dialogs with Escape', () => {
      component.openDetails(merchant);
      component.onEscape();
      expect(component.selected()).toBeNull();
      component.openReject(merchant);
      component.onEscape();
      expect(component.action()).toBeNull();
    });
  });

  describe('one-time credential handoff security', () => {
    it('never persists or logs the one-time secret', () => {
      const setItem = jest.spyOn(Storage.prototype, 'setItem');
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      service.approve.mockReturnValueOnce(of({ merchant: { ...merchant, status: 'APPROVED' }, clientId: 'client-1', clientSecret: 'never-persist-secret' }));
      component.openApprove(merchant);
      component.confirmAction();
      fixture.detectChanges();
      expect(setItem).not.toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toContain('never-persist-secret');
      expect(service.sendCredentialsEmail).not.toHaveBeenCalled();
      setItem.mockRestore();
      log.mockRestore();
    });

    it('labels a recovery handoff distinctly from an approval', () => {
      service.recover = jest.fn().mockReturnValue(of({ merchant: { ...merchant, status: 'APPROVED' }, clientId: 'same-client', clientSecret: 'replacement-secret' }));
      component.openRecover({ ...merchant, status: 'APPROVED', credentialRecoveryAvailable: true });
      component.confirmReplacement.set(true);
      component.confirmAction();
      fixture.detectChanges();
      expect(component.handoff()?.kind).toBe('recovery');
      expect(fixture.nativeElement.textContent).toContain('Credentials Replaced — Secure Credential Handoff');
      (fixture.nativeElement.querySelector('#handoff-done') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('replacement-secret');
    });

    it('surfaces API failures without exposing credentials', () => {
      service.messageFor.mockReturnValue('Approval failed: the auth service encountered an error.');
      service.approve.mockReturnValueOnce(throwError(() => ({ status: 502 })));
      component.openApprove(merchant);
      component.confirmAction();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Approval failed');
      expect(fixture.nativeElement.querySelector('#merchant-credential-handoff')).toBeNull();
    });
  });
});
