import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DispatchZonesComponent } from './dispatch-zones.component';
import { DispatchNotificationsService } from './dispatch-notifications.service';

describe('DispatchZonesComponent', () => {
  let component: DispatchZonesComponent;
  let fixture: ComponentFixture<DispatchZonesComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DispatchZonesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DispatchZonesComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne('/api/v1/admin/zones').flush([
      { id: '1', name: 'COLOMBO', districts: ['Colombo'], served: true, baseFeeLkr: 500, createdAt: '', updatedAt: '' },
      { id: '2', name: 'GAMPAHA', districts: ['Gampaha'], served: true, baseFeeLkr: 500, createdAt: '', updatedAt: '' },
    ]);
    fixture.detectChanges();
  });

  it('should create and render initial delivery zones', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#zones')).toBeTruthy();
    expect(compiled.textContent).toContain('COLOMBO');
    expect(compiled.textContent).toContain('GAMPAHA');
    expect(component.zones().length).toBe(2);
  });

  it('should render inside the shared portal shell (sidebar links are tested in DispatchLayoutComponent)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('aside')).toBeNull();
    expect(compiled.querySelector('#tab-queue-link')).toBeNull();
  });

  it('should filter zones by name or district with the portal search', () => {
    component.searchQuery.set('gampaha');
    expect(component.filteredZones().map((z) => z.name)).toEqual(['GAMPAHA']);
    component.searchQuery.set('nowhere');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('#zones-no-match')).toBeTruthy();
  });

  it('should pick districts by clicking options in the district picker', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const click = (selector: string) => {
      (compiled.querySelector(selector) as HTMLElement).click();
      fixture.detectChanges();
    };

    click('#zone-districts-toggle');
    expect(compiled.querySelector('#zone-districts-panel')).toBeTruthy();
    expect(compiled.querySelectorAll('#zone-districts-panel [role="option"]')).toHaveLength(25);

    click('#zone-district-option-Kandy');
    click('#zone-district-option-Colombo');
    expect(component.zoneForm.get('districts')?.value).toEqual(['Colombo', 'Kandy']);
    expect(compiled.querySelector('#zone-districts-toggle')?.textContent).toContain('2 districts selected');

    click('#zone-district-option-Kandy');
    expect(component.zoneForm.get('districts')?.value).toEqual(['Colombo']);

    component.districtFilter.set('mat');
    fixture.detectChanges();
    expect(component.filteredDistricts()).toEqual(['Matale', 'Matara']);
    click('#zone-districts-select-all');
    expect(component.zoneForm.get('districts')?.value).toEqual(['Colombo', 'Matale', 'Matara']);

    click('#zone-districts-done');
    expect(compiled.querySelector('#zone-districts-panel')).toBeNull();
    expect(compiled.querySelector('#zone-districts-chips')?.textContent).toContain('Matara');
  });

  it('should show the edited zone districts in the picker', () => {
    component.editZone(component.zones()[0]);
    fixture.detectChanges();
    expect(component.selectedDistricts()).toEqual(['Colombo']);
    expect((fixture.nativeElement as HTMLElement).querySelector('#zone-districts-toggle')?.textContent).toContain('1 district selected');
  });

  it('should expose all 25 canonical districts for zone configuration', () => {
    expect(component.districts).toEqual([
      'Ampara',
      'Anuradhapura',
      'Badulla',
      'Batticaloa',
      'Colombo',
      'Galle',
      'Gampaha',
      'Hambantota',
      'Jaffna',
      'Kalutara',
      'Kandy',
      'Kegalle',
      'Kilinochchi',
      'Kurunegala',
      'Mannar',
      'Matale',
      'Matara',
      'Monaragala',
      'Mullaitivu',
      'Nuwara Eliya',
      'Polonnaruwa',
      'Puttalam',
      'Ratnapura',
      'Trincomalee',
      'Vavuniya',
    ]);
  });

  it('should show validation feedback when form inputs are invalid and touched', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nameControl = component.zoneForm.get('name');
    nameControl?.setValue('');
    nameControl?.markAsTouched();

    const districtsControl = component.zoneForm.get('districts');
    districtsControl?.setValue([]);
    districtsControl?.markAsTouched();

    const feeControl = component.zoneForm.get('baseFeeLkr');
    feeControl?.setValue(-10);
    feeControl?.markAsTouched();

    fixture.detectChanges();

    expect(component.zoneForm.invalid).toBe(true);
    expect(compiled.querySelector('#zone-name-error')?.textContent).toContain('Zone name is required');
    expect(compiled.querySelector('#zone-districts-error')?.textContent).toContain('At least one district must be selected');
    expect(compiled.querySelector('#zone-fee-error')?.textContent).toContain('Base fee must be 0 or greater');
  });

  it('should add a new zone upon valid submission and reset form', () => {
    const initialCount = component.zones().length;

    component.zoneForm.setValue({
      name: 'KANDY_CENTRAL',
      districts: ['Kandy'],
      served: true,
      baseFeeLkr: 650,
    });
    fixture.detectChanges();

    expect(component.zoneForm.valid).toBe(true);

    component.saveZone();
    const createRequest = httpMock.expectOne('/api/v1/admin/zones');
    expect(createRequest.request.method).toBe('POST');
    createRequest.flush({ id: '3', name: 'KANDY_CENTRAL', districts: ['Kandy'], served: true, baseFeeLkr: 650, createdAt: '', updatedAt: '' });
    httpMock.expectOne('/api/v1/admin/zones').flush([
      { id: '3', name: 'KANDY_CENTRAL', districts: ['Kandy'], served: true, baseFeeLkr: 650, createdAt: '', updatedAt: '' },
    ]);
    component.zones.set([{ id: '3', name: 'KANDY_CENTRAL', districts: ['Kandy'], served: true, baseFeeLkr: 650, createdAt: '', updatedAt: '' }]);
    fixture.detectChanges();

    expect(component.zones().length).toBe(1);
    const added = component.zones().find((z) => z.name === 'KANDY_CENTRAL');
    expect(added).toBeDefined();
    expect(added?.baseFeeLkr).toBe(650);
    expect(added?.districts).toContain('Kandy');

    // Form should be reset
    expect(component.zoneForm.get('name')?.value).toBe('');
    expect(component.zoneForm.get('districts')?.value).toEqual([]);
  });

  it('should display success feedback banner after adding a zone', () => {
    component.zoneForm.setValue({
      name: 'GALLE_COAST',
      districts: ['Galle'],
      served: true,
      baseFeeLkr: 500,
    });
    component.saveZone();

    const createReq = httpMock.expectOne('/api/v1/admin/zones');
    createReq.flush({ id: '10', name: 'GALLE_COAST', districts: ['Galle'], served: true, baseFeeLkr: 500 });
    httpMock.expectOne('/api/v1/admin/zones').flush([]);
    fixture.detectChanges();

    expect(component.successMessage()).toContain('GALLE_COAST');
    // Confirmations are shown as toasts, not an inline banner.
    expect((fixture.nativeElement as HTMLElement).querySelector('#zone-success-banner')).toBeNull();
    expect(TestBed.inject(DispatchNotificationsService).toasts().at(-1)).toMatchObject({ kind: 'success' });
    expect(TestBed.inject(DispatchNotificationsService).toasts().at(-1)?.title).toContain('GALLE_COAST');
  });

  it('should display success feedback banner after deleting a zone', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const zoneToDelete: any = { id: '1', name: 'COLOMBO' };
    component.removeZone(zoneToDelete);

    const delReq = httpMock.expectOne('/api/v1/admin/zones/1');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
    httpMock.expectOne('/api/v1/admin/zones').flush([]);
    fixture.detectChanges();

    expect(component.successMessage()).toContain('COLOMBO');
    expect(component.successMessage()).toContain('deleted successfully');
  });

  it('should prevent duplicate zone submissions while save is in progress', () => {
    component.isSaving.set(true);
    component.zoneForm.setValue({
      name: 'DUPLICATE_ZONE',
      districts: ['Colombo'],
      served: true,
      baseFeeLkr: 500,
    });
    component.saveZone();
    httpMock.expectNone('/api/v1/admin/zones');
  });
});
