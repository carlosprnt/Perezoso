// Minimal type stub for @react-native-community/datetimepicker.
// Replaced by the real types once `npm install` is run.
declare module '@react-native-community/datetimepicker' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export type AndroidMode = 'date' | 'time' | 'datetime';
  export type IOSMode = 'date' | 'time' | 'datetime' | 'countdown';
  export type AndroidDisplay = 'default' | 'spinner' | 'calendar' | 'clock';
  export type IOSDisplay = 'default' | 'compact' | 'inline' | 'spinner';
  export type Event = { type: string; nativeEvent: { timestamp?: number; utcOffset?: number } };
  export type DateTimePickerEvent = Event;

  export interface DateTimePickerProps {
    value: Date;
    mode?: AndroidMode | IOSMode;
    display?: AndroidDisplay | IOSDisplay;
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
    minimumDate?: Date;
    maximumDate?: Date;
    locale?: string;
    themeVariant?: 'light' | 'dark';
    accentColor?: string;
    textColor?: string;
    style?: ViewStyle;
    testID?: string;
  }

  export default class DateTimePicker extends Component<DateTimePickerProps> {}
}
