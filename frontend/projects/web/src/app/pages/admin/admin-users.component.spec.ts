import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminUsersComponent } from './admin-users.component';
import { AdminUsersService } from './admin-users.service';
import { UserSummary } from './admin-users.model';

describe('AdminUsersComponent', () => {
  let component: AdminUsersComponent;
  let fixture: ComponentFixture<AdminUsersComponent>;
  let adminUsersServiceMock: any;

  const mockUsers: UserSummary[] = [
    {
      id: 'usr-1',
      email: 'courier.kamal@swiftdrop.lk',
      fullName: 'Kamal Gunaratne',
      phoneNumber: '+94771234567',
      role: 'COURIER',
      enabled: true,
      zone: 'COLOMBO_ZONE',
      createdAt: '2026-10-25T13:20:00Z',
    },
    {
      id: 'usr-2',
      email: 'dispatch.anura@swiftdrop.lk',
      fullName: 'Anura Silva',
      phoneNumber: '+94777654321',
      role: 'DISPATCHER',
      enabled: false,
      createdAt: '2026-10-26T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    adminUsersServiceMock = {
      users: jest.fn(() => mockUsers),
      totalElements: jest.fn(() => 2),
      totalPages: jest.fn(() => 1),
      currentPage: jest.fn(() => 0),
      pageSize: jest.fn(() => 20),
      loading: jest.fn(() => false),
      error: jest.fn(() => null),
      roleCounts: jest.fn(() => ({ MERCHANT: 0, CUSTOMER: 0, DISPATCHER: 1, COURIER: 1 })),
      loadUsers: jest.fn(() =>
        of({
          content: mockUsers,
          totalElements: 2,
          totalPages: 1,
          page: 0,
          size: 20,
        })
      ),
      loadDeliveryZones: jest.fn(() =>
        of([
          { id: 'z-1', name: 'COLOMBO_ZONE', districts: ['Colombo'], served: true, baseFeeLkr: 500 },
          { id: 'z-2', name: 'GAMPAHA_ZONE', districts: ['Gampaha'], served: true, baseFeeLkr: 500 },
        ])
      ),
      createStaffUser: jest.fn(),
      updateUserStatus: jest.fn(),
      clearState: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent, FormsModule],
      providers: [
        { provide: AdminUsersService, useValue: adminUsersServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render staff user management table with real backend data', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#open-create-user-modal-btn')).toBeTruthy();
    expect(compiled.querySelector('#user-role-filter')).toBeTruthy();
    const roleOptions = Array.from(compiled.querySelectorAll('#user-role-filter option')).map(
      (opt) => (opt as HTMLOptionElement).value
    );
    expect(roleOptions).toEqual(['', 'CUSTOMER', 'MERCHANT', 'DISPATCHER', 'COURIER']);
    expect(compiled.querySelector('#user-status-filter')).toBeTruthy();
    expect(adminUsersServiceMock.loadUsers).toHaveBeenCalledWith(0, 15, undefined, undefined);

    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(compiled.textContent).toContain('Kamal Gunaratne');
    expect(compiled.textContent).toContain('Anura Silva');
  });

  it('should trigger server-side reload when role filter changes', () => {
    component.onRoleFilterChange('COURIER');
    expect(component.userRoleFilter()).toBe('COURIER');
    expect(adminUsersServiceMock.loadUsers).toHaveBeenCalledWith(0, 15, 'COURIER', undefined);
  });

  it('should trigger server-side reload when status filter changes', () => {
    component.onStatusFilterChange('true');
    expect(component.userStatusFilter()).toBe('true');
    expect(adminUsersServiceMock.loadUsers).toHaveBeenCalledWith(0, 15, undefined, true);
  });

  it('should toggle user account status via PATCH request', () => {
    const userToToggle = mockUsers[0]; // currently enabled: true
    const updatedUser: UserSummary = { ...userToToggle, enabled: false };
    adminUsersServiceMock.updateUserStatus.mockReturnValue(of(updatedUser));

    component.toggleUserStatus(userToToggle);

    expect(adminUsersServiceMock.updateUserStatus).toHaveBeenCalledWith('usr-1', false);
    expect(component.toastMessage()).toContain('Disabled');
    expect(component.toastType()).toBe('success');
  });

  it('should handle toggle status failure without corrupting state', () => {
    const userToToggle = mockUsers[0];
    adminUsersServiceMock.updateUserStatus.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Database failure' } }))
    );

    component.toggleUserStatus(userToToggle);

    expect(component.toastMessage()).toContain('Database failure');
    expect(component.toastType()).toBe('error');
    expect(component.updatingUserId()).toBeNull();
  });

  it('should validate form fields according to OpenAPI contract constraints', () => {
    component.newUserFullName = '';
    component.newUserEmail = 'invalid-email';
    component.newUserPhone = '123'; // invalid: must be exactly 10 digits
    component.newUserRole = 'COURIER';

    expect(component.isPhoneValid()).toBe(false);
    expect(component.isFormValid()).toBe(false);

    component.newUserFullName = 'Saman Kumara';
    component.newUserEmail = 'courier.saman@swiftdrop.lk';
    component.newUserPhone = '0771234567'; // valid 10 digits
    component.newUserZone.set('COLOMBO_ZONE');

    expect(component.isPhoneValid()).toBe(true);
    expect(component.isFormValid()).toBe(true);
  });

  it('should submit valid staff creation and close modal on HTTP 201 success', () => {
    component.openCreateUserModal();
    component.newUserFullName = 'Saman Kumara';
    component.newUserEmail = 'courier.saman@swiftdrop.lk';
    component.newUserPhone = '0771234567';
    component.newUserRole = 'COURIER';
    component.newUserZone.set('COLOMBO_ZONE');

    const createdResponse: UserSummary = {
      id: 'usr-new-1',
      email: 'courier.saman@swiftdrop.lk',
      fullName: 'Saman Kumara',
      phoneNumber: '0771234567',
      role: 'COURIER',
      enabled: true,
      createdAt: '2026-10-28T12:00:00Z',
    };
    adminUsersServiceMock.createStaffUser.mockReturnValue(of(createdResponse));

    component.submitCreateStaffUser();

    expect(adminUsersServiceMock.createStaffUser).toHaveBeenCalledWith({
      fullName: 'Saman Kumara',
      email: 'courier.saman@swiftdrop.lk',
      phoneNumber: '0771234567',
      role: 'COURIER',
      zone: 'COLOMBO_ZONE',
    });
    expect(component.toastMessage()).toContain('provisioned');
    expect(component.isCreateUserModalOpen()).toBe(false);
    expect(component.newUserPhone).toBe('');
    expect(adminUsersServiceMock.loadUsers).toHaveBeenCalled();
  });

  it('should handle HTTP 409 duplicate email by keeping modal open and displaying error', () => {
    component.openCreateUserModal();
    component.newUserFullName = 'Saman Kumara';
    component.newUserEmail = 'courier.duplicate@swiftdrop.lk';
    component.newUserPhone = '0771234567';
    component.newUserRole = 'COURIER';
    component.newUserZone.set('COLOMBO_ZONE');

    adminUsersServiceMock.createStaffUser.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'A user account with this email address already exists.' },
      }))
    );

    component.submitCreateStaffUser();

    expect(component.isCreateUserModalOpen()).toBe(true);
    expect(component.modalError()).toContain('already exists');
    expect(component.toastType()).toBe('error');
    expect(component.newUserEmail).toBe('courier.duplicate@swiftdrop.lk'); // user can fix email
  });

  it('should display loading spinner when service is loading', () => {
    adminUsersServiceMock.loading.mockReturnValue(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#admin-users-loading')).toBeTruthy();
  });

  it('should display empty state when user list is empty and not loading', () => {
    adminUsersServiceMock.users.mockReturnValue([]);
    adminUsersServiceMock.loading.mockReturnValue(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#admin-users-empty')).toBeTruthy();
    expect(compiled.textContent).toContain('No users found');
  });

  it('should display error message and allow retry when service has error', () => {
    adminUsersServiceMock.error.mockReturnValue('Network connection failed');
    adminUsersServiceMock.loading.mockReturnValue(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const errorEl = compiled.querySelector('#admin-users-error');
    expect(errorEl).toBeTruthy();
    expect(errorEl?.textContent).toContain('Network connection failed');

    const retryBtn = compiled.querySelector('#admin-users-retry-btn') as HTMLButtonElement;
    retryBtn.click();
    expect(adminUsersServiceMock.loadUsers).toHaveBeenCalled();
  });

  it('should handle pagination next and previous page navigation', () => {
    adminUsersServiceMock.totalPages.mockReturnValue(3);
    adminUsersServiceMock.currentPage.mockReturnValue(1);
    adminUsersServiceMock.totalElements.mockReturnValue(45);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#page-info')?.textContent).toContain('Page 2 of 3');

    component.goToPage(2);
    expect(adminUsersServiceMock.loadUsers).toHaveBeenCalledWith(2, 15, undefined, undefined);

    component.goToPage(0);
    expect(adminUsersServiceMock.loadUsers).toHaveBeenCalledWith(0, 15, undefined, undefined);
  });

  it('should filter users reactively when search query is entered', () => {
    component.adminSearchService.setQuery('Kamal');
    fixture.detectChanges();

    expect(component.filteredUsers().length).toBe(1);
    expect(component.filteredUsers()[0].fullName).toBe('Kamal Gunaratne');

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(compiled.textContent).toContain('Kamal Gunaratne');
    expect(compiled.textContent).not.toContain('Anura Silva');

    // Clear search
    component.adminSearchService.clear();
    fixture.detectChanges();
    expect(component.filteredUsers().length).toBe(2);
  });

  it('should show empty search state when no users match search query', () => {
    component.adminSearchService.setQuery('NonExistentName');
    fixture.detectChanges();

    expect(component.filteredUsers().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#admin-users-search-empty')).toBeTruthy();
    expect(compiled.textContent).toContain('No matching staff accounts found');
  });

  it('should require two-step inline confirmation before disabling account', () => {
    const userToToggle = mockUsers[0]; // enabled: true
    const updatedUser: UserSummary = { ...userToToggle, enabled: false };
    adminUsersServiceMock.updateUserStatus.mockReturnValue(of(updatedUser));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const initialBtn = compiled.querySelector('#toggle-user-usr-1-btn') as HTMLButtonElement;
    expect(initialBtn.textContent?.trim()).toBe('Disable Account');

    // Click Disable Account -> enters confirmation state
    initialBtn.click();
    fixture.detectChanges();

    expect(component.pendingConfirmUserId()).toBe('usr-1');
    expect(adminUsersServiceMock.updateUserStatus).not.toHaveBeenCalled();

    const confirmBtn = compiled.querySelector('#confirm-toggle-user-usr-1-btn') as HTMLButtonElement;
    const cancelBtn = compiled.querySelector('#cancel-toggle-user-usr-1-btn') as HTMLButtonElement;
    expect(confirmBtn).toBeTruthy();
    expect(confirmBtn.textContent?.trim()).toBe('Confirm Disable');
    expect(cancelBtn).toBeTruthy();

    // Click Confirm Disable -> executes update
    confirmBtn.click();
    fixture.detectChanges();

    expect(adminUsersServiceMock.updateUserStatus).toHaveBeenCalledWith('usr-1', false);
    expect(component.pendingConfirmUserId()).toBeNull();
  });

  it('should require two-step inline confirmation before enabling account and allow cancel', () => {
    const userToToggle = mockUsers[1]; // enabled: false
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const initialBtn = compiled.querySelector('#toggle-user-usr-2-btn') as HTMLButtonElement;
    expect(initialBtn.textContent?.trim()).toBe('Enable Account');

    // Click Enable Account -> enters confirmation state
    initialBtn.click();
    fixture.detectChanges();

    expect(component.pendingConfirmUserId()).toBe('usr-2');
    const confirmBtn = compiled.querySelector('#confirm-toggle-user-usr-2-btn') as HTMLButtonElement;
    const cancelBtn = compiled.querySelector('#cancel-toggle-user-usr-2-btn') as HTMLButtonElement;
    expect(confirmBtn.textContent?.trim()).toBe('Confirm Enable');

    // Click Cancel -> reverts back without calling service
    cancelBtn.click();
    fixture.detectChanges();

    expect(component.pendingConfirmUserId()).toBeNull();
    expect(adminUsersServiceMock.updateUserStatus).not.toHaveBeenCalled();
    expect(compiled.querySelector('#toggle-user-usr-2-btn')).toBeTruthy();
  });

  it('should render Zone column header and display assigned zones in the table', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const headers = Array.from(compiled.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    expect(headers).toContain('Zone');

    const rows = compiled.querySelectorAll('tbody tr');
    // First row has zone: 'COLOMBO_ZONE'
    expect(rows[0].textContent).toContain('COLOMBO_ZONE');
    // Second row has no zone -> displays '—'
    expect(rows[1].textContent).toContain('—');
  });

  it('should filter delivery zone suggestions when typing in zone input and select zone', () => {
    component.openCreateUserModal();
    fixture.detectChanges();

    expect(component.availableZones().length).toBe(2);

    // Typing 'col' should filter matching zones
    component.onZoneInputChange('col');
    expect(component.matchingZones().length).toBe(1);
    expect(component.matchingZones()[0].name).toBe('COLOMBO_ZONE');

    // Selecting the zone sets the input
    component.selectZone('COLOMBO_ZONE');
    expect(component.newUserZone()).toBe('COLOMBO_ZONE');
    expect(component.showZoneDropdown()).toBe(false);
  });

  it('should include assigned zone in payload when provisioning staff user with zone', () => {
    component.openCreateUserModal();
    component.newUserFullName = 'Nimal Perera';
    component.newUserEmail = 'courier.nimal@swiftdrop.lk';
    component.newUserPhone = '0771234567';
    component.newUserRole = 'COURIER';
    component.newUserZone.set('COLOMBO_ZONE');

    const createdResponse: UserSummary = {
      id: 'usr-new-2',
      email: 'courier.nimal@swiftdrop.lk',
      fullName: 'Nimal Perera',
      phoneNumber: '0771234567',
      role: 'COURIER',
      enabled: true,
      zone: 'COLOMBO_ZONE',
      createdAt: '2026-10-28T12:00:00Z',
    };
    adminUsersServiceMock.createStaffUser.mockReturnValue(of(createdResponse));

    component.submitCreateStaffUser();

    expect(adminUsersServiceMock.createStaffUser).toHaveBeenCalledWith({
      fullName: 'Nimal Perera',
      email: 'courier.nimal@swiftdrop.lk',
      phoneNumber: '0771234567',
      role: 'COURIER',
      zone: 'COLOMBO_ZONE',
    });
    expect(component.isCreateUserModalOpen()).toBe(false);
    expect(component.newUserZone()).toBe('');
  });

  it('should require delivery zone for form validity', () => {
    component.newUserFullName = 'Kamal Perera';
    component.newUserEmail = 'courier.kamal@swiftdrop.lk';
    component.newUserPhone = '0771234567';
    component.newUserRole = 'COURIER';

    // Zone empty -> invalid
    component.newUserZone.set('');
    expect(component.isFormValid()).toBe(false);

    // Zone whitespace only -> invalid
    component.newUserZone.set('   ');
    expect(component.isFormValid()).toBe(false);

    // Zone provided -> valid
    component.newUserZone.set('COLOMBO_ZONE');
    expect(component.isFormValid()).toBe(true);
  });
});
