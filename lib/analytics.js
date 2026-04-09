import { supabase } from '@/lib/supabase';

const VISITOR_KEY = 'masters-pool-visitor';

export function getVisitorId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function detectDevice() {
  if (typeof navigator === 'undefined') return 'Desktop';
  const ua = navigator.userAgent || '';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/iPhone|iPod/i.test(ua)) return 'iPhone';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android' : 'Android';
  return 'Desktop';
}

export async function logEvent({ eventType = 'pageview', searchQuery = null } = {}) {
  const visitor_id = getVisitorId();
  if (!visitor_id) return;
  const device = detectDevice();
  try {
    await supabase.from('page_views').insert({
      visitor_id,
      device,
      search_query: searchQuery,
      event_type: eventType,
    });
  } catch {
    // swallow — analytics must never break the app
  }
}
