import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AssistantChatComponent } from './assistant-chat.component';
import { NotificationService } from '../../notification/notification.service';

describe('AssistantChatComponent', () => {
  let fixture: ComponentFixture<AssistantChatComponent>;
  let component: AssistantChatComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    const mockNotificationService = {
      unreadCount: signal(0),
      notifications: signal([]),
      totalElements: signal(0),
      isLoading: signal(false),
      error: signal(null),
      refreshUnreadCount: () => of(0),
      loadNotifications: () => of([]),
    };

    await TestBed.configureTestingModule({
      imports: [AssistantChatComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantChatComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('profile menu', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const openMenu = () => {
      el().querySelector<HTMLButtonElement>('#profile-menu-btn')!.click();
      fixture.detectChanges();
    };

    it('clicking the name opens a menu with Settings and Log out', () => {
      expect(el().querySelector('#profile-menu-panel')).toBeNull();
      openMenu();
      expect(el().querySelector('#profile-menu-settings')!.textContent).toContain('Settings');
      expect(el().querySelector('#profile-menu-logout')!.textContent).toContain('Log out');
    });

    it('Settings navigates to the customer settings tab', () => {
      const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      openMenu();
      el().querySelector<HTMLButtonElement>('#profile-menu-settings')!.click();
      expect(navigate).toHaveBeenCalledWith(['/customer'], { queryParams: { tab: 'settings' } });
    });

    it('Log out asks for confirmation first', () => {
      openMenu();
      el().querySelector<HTMLButtonElement>('#profile-menu-logout')!.click();
      fixture.detectChanges();
      expect(el().querySelector('#profile-menu-panel')).toBeNull();
      expect(el().querySelector('#logout-confirm-modal')).not.toBeNull();
    });
  });

  it('should render welcome state when no messages', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#assistant-suggestions')).toBeTruthy();
    expect(component['messages']().length).toBe(0);
  });

  it('should disable send button when input is empty', () => {
    const btn = fixture.nativeElement.querySelector('#assistant-send-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('should enable send button when input has text', () => {
    component['inputText'] = 'Where is my parcel?';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('#assistant-send-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('should disable send when input exceeds 500 characters', () => {
    component['inputText'] = 'a'.repeat(501);
    fixture.detectChanges();
    expect(component['canSend']).toBe(false);
  });

  it('should add user message and call backend on sendMessage()', fakeAsync(() => {
    component['inputText'] = 'Where is my parcel?';
    component['sendMessage']();
    tick();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/v1/assistant/chat');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.message).toBe('Where is my parcel?');

    req.flush({ reply: 'Your parcel is in transit.', conversationId: 'conv-abc' });
    tick();
    fixture.detectChanges();

    const msgs = component['messages']();
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].text).toBe('Where is my parcel?');
    expect(msgs[1].role).toBe('assistant');
    expect(msgs[1].text).toBe('Your parcel is in transit.');
  }));

  it('should show safe error message when backend fails', fakeAsync(() => {
    component['inputText'] = 'Status please';
    component['sendMessage']();
    tick();

    const req = httpMock.expectOne('/api/v1/assistant/chat');
    req.error(new ProgressEvent('error'));
    tick();
    fixture.detectChanges();

    const msgs = component['messages']();
    expect(msgs.length).toBe(2);
    expect(msgs[1].role).toBe('assistant');
    expect(msgs[1].text).toContain('temporarily unavailable');
  }));

  it('should clear conversation on clearConversation()', fakeAsync(() => {
    component['inputText'] = 'Test';
    component['sendMessage']();
    tick();
    httpMock.expectOne('/api/v1/assistant/chat').flush({ reply: 'ok', conversationId: 'c1' });
    tick();
    fixture.detectChanges();

    expect(component['messages']().length).toBeGreaterThan(0);
    component['clearConversation']();
    expect(component['messages']().length).toBe(0);
  }));

  it('should use suggestion text and send on useSuggestion()', fakeAsync(() => {
    component['useSuggestion']('Where is my parcel?');
    tick();

    const req = httpMock.expectOne('/api/v1/assistant/chat');
    expect(req.request.body.message).toBe('Where is my parcel?');
    req.flush({ reply: 'info', conversationId: 'c2' });
    tick();
  }));

  it('should send on Enter but not Shift+Enter', fakeAsync(() => {
    component['inputText'] = 'Hello';
    const spy = jest.spyOn(component as any, 'sendMessage');

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
    component['onEnter'](enterEvent);
    expect(spy).toHaveBeenCalled();

    // Flush the pending HTTP request triggered by sendMessage
    httpMock.expectOne('/api/v1/assistant/chat').flush({ reply: 'ok', conversationId: 'c-enter' });
    tick();

    spy.mockClear();
    component['inputText'] = 'Hello';
    const shiftEnter = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
    component['onEnter'](shiftEnter);
    expect(spy).not.toHaveBeenCalled();
  }));

  it('should navigate back to customer deliveries on goBack()', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate');
    (component as any).goBack();
    expect(navigateSpy).toHaveBeenCalledWith(['/customer']);
  });

  it('should format markdown bold into strong tags without raw asterisks', () => {
    const input = 'Here are details for parcel **SD-20261114-BEK6JR**:\n• **Status:** CANCELLED';
    const output = (component as any).formatMessage(input);
    const html = (output as any).changingThisBreaksApplicationSecurity || output.toString();

    expect(html).toContain('<strong class="font-bold">SD-20261114-BEK6JR</strong>');
    expect(html).toContain('<strong class="font-bold">Status:</strong>');
    expect(html).not.toContain('**');
  });

  it('should safely escape raw HTML tags', () => {
    const input = '<script>alert(1)</script> **safe bold**';
    const output = (component as any).formatMessage(input);
    const html = (output as any).changingThisBreaksApplicationSecurity || output.toString();

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<strong class="font-bold">safe bold</strong>');
  });
});

