import type { Dispatch, SetStateAction } from 'react';
import type { Key } from 'react';
import type { AppRoute, ChatMessage } from '../data/mockData';
import type { ApiResponse } from '../data/apiMockData';

export type ThemeMode = 'light' | 'dark';

export type AlertState = {
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  description?: string;
};

export type Navigate = (route: AppRoute) => void;

export type ShowAlert = (alert: AlertState) => void;

export type RunApiAction = <T>(
  key: string,
  action: () => Promise<ApiResponse<T>>,
  afterComplete?: (response: ApiResponse<T>) => void,
) => Promise<void>;

export type ChatMessagesSetter = Dispatch<SetStateAction<ChatMessage[]>>;

export type KeySetter = Dispatch<SetStateAction<Key[]>>;
