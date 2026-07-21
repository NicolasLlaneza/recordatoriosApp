import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  EditReminder: { id?: string } | undefined;
  Settings: undefined;
  Account: undefined;
  Groups: undefined;
  GroupDetail: { groupId: string; name: string };
  EditGroupReminder: { groupId: string; id?: string };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
