import { setTimezoneHandler } from '@vben/stores';

import { useAbpStore } from '@abp/core';
import { useTimeZoneSettingsApi } from '@abp/settings';

export const isValidTimezone = (timezone: string): boolean => {
  if (!timezone || typeof timezone !== 'string') return false;
  if (timezone.startsWith('<!DOCTYPE') || timezone.startsWith('<html')) {
    return false;
  }
  return /^[A-Za-z]+(\/[A-Za-z_]+)+$/.test(timezone);
};

export function cleanupInvalidTimezoneFromStorage(namespace: string) {
  const storageKey = `${namespace}-core-timezone`;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      let parsed: any;
      try {
        parsed = JSON.parse(stored);
      } catch {
        return;
      }
      if (parsed.timezone && !isValidTimezone(parsed.timezone)) {
        console.warn(
          'Cleaning invalid timezone from localStorage:',
          parsed.timezone?.slice(0, 50),
          '...',
        );
        localStorage.removeItem(storageKey);
      }
    }
  } catch (error) {
    console.warn(
      'Failed to cleanup invalid timezone from localStorage:',
      error,
    );
  }
}

export function initTimezone() {
  const abpStore = useAbpStore();
  const { getMyTimezoneApi, getTimezonesApi, updateMyTimezoneApi } =
    useTimeZoneSettingsApi();

  setTimezoneHandler({
    async getTimezone() {
      if (!abpStore.application?.currentUser.isAuthenticated) {
        return undefined;
      }
      try {
        const timezone = await getMyTimezoneApi();
        if (isValidTimezone(timezone)) {
          return timezone;
        }
        console.warn(
          'Invalid timezone format received, ignoring:',
          typeof timezone,
        );
        return undefined;
      } catch (error) {
        console.warn('Failed to get timezone:', error);
        return undefined;
      }
    },
    setTimezone(timezone: string) {
      return updateMyTimezoneApi(timezone);
    },
    async getTimezoneOptions() {
      const timezones = await getTimezonesApi();
      return timezones.map((timezone) => {
        return {
          label: timezone.name,
          value: timezone.value,
        };
      });
    },
  });
}
