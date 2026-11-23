import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AdminComponent } from './admin.component';
import { AdminAuditService, AuditRecord } from './admin/admin-audit.service';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let auditService: AdminAuditService;

  const mockRecords: AuditRecord[] = [
    {
      id: 'rec-1',
      occurredAt: '2026-11-18T08:00:00Z',
      actorId: 'admin-1',
      actorRole: 'ADMIN',
      action: 'MERCHANT_APPROVED',
      targetType: 'MERCHANT',
      targetId: 'm-1',
      details: { fullName: 'Ceylon Spices Co.', email: 'merchant@ceylon.lk' },
    },
    {
      id: 'rec-2',
      occurredAt: '2026-11-18T07:30:00Z',
      actorId: 'admin-1',
      actorRole: 'ADMIN',
      action: 'STAFF_DISABLED',
      targetType: 'USER',
      targetId: 'u-2',
      details: { fullName: 'Sunil Perera', email: 'sunil@swiftdrop.lk', role: 'COURIER' },
    },
    {
      id: 'rec-3',
      occurredAt: '2026-11-18T07:00:00Z',
      actorId: 'admin-1',
      actorRole: 'ADMIN',
      action: 'STAFF_ENABLED',
      targetType: 'USER',
      targetId: 'u-3',
      details: { fullName: 'Kamal Silva', email: 'kamal@swiftdrop.lk', role: 'DISPATCHER' },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    auditService = TestBed.inject(AdminAuditService);

    jest.spyOn(auditService, 'loadAuditLogs').mockReturnValue(
      of({
        content: mockRecords,
        totalElements: 25,
        totalPages: 3,
        page: 0,
        size: 10,
      })
    );

    fixture.detectChanges();
  });

  it('creates and renders admin shell and module governance cards', () => {
    expect(component).toBeTruthy();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Welcome back, admin!');
    expect(element.textContent).toContain('Merchant Approval');
    expect(element.textContent).toContain('Staff Management');

    expect(element.querySelector('#admin-card-staff-link')).toBeTruthy();
    expect(element.querySelector('#admin-card-merchant-approval-link')).toBeTruthy();
    expect(element.querySelector('#admin-reports-card-link')).toBeTruthy();
  });

  it('renders recent administration activities with status badges and details', () => {
    auditService.activities.set(mockRecords);
    auditService.totalElements.set(25);
    auditService.totalPages.set(3);
    auditService.currentPage.set(0);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Merchant Registration Approved');
    expect(element.textContent).toContain('Ceylon Spices Co.');
    expect(element.textContent).toContain('Staff Account Disabled');
    expect(element.textContent).toContain('Sunil Perera');
    expect(element.textContent).toContain('Staff Account Enabled');

    const rows = element.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it('renders all recent activities in a single view without pagination buttons and with clean subtitle', () => {
    auditService.activities.set(mockRecords);
    auditService.totalElements.set(25);
    auditService.totalPages.set(3);
    auditService.currentPage.set(0);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const prevBtn = element.querySelector('#admin-activity-prev-page');
    const nextBtn = element.querySelector('#admin-activity-next-page');

    // Pagination buttons are removed to display all activities directly
    expect(prevBtn).toBeNull();
    expect(nextBtn).toBeNull();

    // Verify cleaned subtitle
    expect(element.textContent).toContain('Recent merchant registrations & approvals, and courier/dispatcher creation.');
    expect(element.textContent).not.toContain('and admin password renewals (10 rows max).');
  });

  it('formats various actions into human readable metadata', () => {
    const merchantMeta = component.formatAction('MERCHANT_APPROVED');
    expect(merchantMeta.title).toBe('Merchant Registration Approved');
    expect(merchantMeta.area).toBe('MERCHANT');
    expect(merchantMeta.status).toBe('APPROVED');

    const disabledMeta = component.formatAction('STAFF_DISABLED');
    expect(disabledMeta.title).toBe('Staff Account Disabled');
    expect(disabledMeta.area).toBe('STAFF');
    expect(disabledMeta.status).toBe('DISABLED');

    const provisionedMeta = component.formatAction('STAFF_PROVISIONED');
    expect(provisionedMeta.title).toBe('Staff Member Provisioned');
    expect(provisionedMeta.area).toBe('STAFF');

    const courierMeta = component.formatAction('STAFF_PROVISIONED', {
      id: '1',
      occurredAt: '2026-11-19T00:00:00Z',
      actorId: 'usr-1',
      actorRole: 'COURIER',
      action: 'STAFF_PROVISIONED',
      targetType: 'USER',
      targetId: 'usr-1',
      details: { role: 'COURIER' },
    });
    expect(courierMeta.title).toBe('Staff Member Provisioned');
    expect(courierMeta.area).toBe('COURIER');

    const dispatcherMeta = component.formatAction('STAFF_PROVISIONED', {
      id: '2',
      occurredAt: '2026-11-19T00:00:00Z',
      actorId: 'usr-2',
      actorRole: 'DISPATCHER',
      action: 'STAFF_PROVISIONED',
      targetType: 'USER',
      targetId: 'usr-2',
      details: { role: 'DISPATCHER' },
    });
    expect(dispatcherMeta.title).toBe('Staff Member Provisioned');
    expect(dispatcherMeta.area).toBe('DISPATCHER');
  });

  it('provides a settings link in the header navigating to /admin/settings', () => {
    const element = fixture.nativeElement as HTMLElement;
    const settingsLink = element.querySelector('#admin-settings-btn') as HTMLElement;
    expect(settingsLink).toBeTruthy();
    expect(settingsLink.textContent).toContain('Settings');
    expect(settingsLink.getAttribute('href')).toContain('/admin/settings');
  });
});
