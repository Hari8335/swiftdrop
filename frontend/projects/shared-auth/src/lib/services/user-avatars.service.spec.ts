import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { USER_AVATAR_TTL_MS, UserAvatarsService } from './user-avatars.service';

describe('UserAvatarsService', () => {
  let service: UserAvatarsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserAvatarsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    jest.restoreAllMocks();
  });

  it('fetches pictures in one batch and returns null for users without one', () => {
    service.load(['c1', 'c2', 'c1', null, '']);

    const req = http.expectOne((r) => r.url === '/api/v1/auth/avatars');
    expect(req.request.params.get('userIds')).toBe('c1,c2');
    req.flush({ c1: 'data:image/png;base64,AAAA' });

    expect(service.avatarFor('c1')).toBe('data:image/png;base64,AAAA');
    expect(service.avatarFor('c2')).toBeNull();
    expect(service.avatarFor(undefined)).toBeNull();
  });

  it('reuses cached pictures and does not send duplicate requests', () => {
    service.load(['c1']);
    service.load(['c1']); // still in flight
    http.expectOne((r) => r.url === '/api/v1/auth/avatars').flush({});
    service.load(['c1']); // cached
    http.expectNone((r) => r.url === '/api/v1/auth/avatars');
  });

  it('refreshes after the cache expires so other people\'s changes appear', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    service.load(['c1']);
    http.expectOne((r) => r.url === '/api/v1/auth/avatars').flush({ c1: 'data:image/png;base64,OLD=' });

    now.mockReturnValue(1_000_000 + USER_AVATAR_TTL_MS + 1);
    service.load(['c1']);
    http.expectOne((r) => r.url === '/api/v1/auth/avatars').flush({ c1: 'data:image/png;base64,NEW=' });
    expect(service.avatarFor('c1')).toBe('data:image/png;base64,NEW=');
  });

  it('keeps initials (null) when the lookup fails', () => {
    service.load(['c1']);
    http.expectOne((r) => r.url === '/api/v1/auth/avatars').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(service.avatarFor('c1')).toBeNull();
  });
});
