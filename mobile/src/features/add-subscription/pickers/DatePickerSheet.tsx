// DatePickerSheet — custom month-grid calendar rendered in a Modal.
//
// No native deps: pure RN primitives. Chevron-left / chevron-right
// navigate months; tapping a day selects it and closes the sheet.
// Today is subtly marked; the selected date gets a filled black pill.

import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../../design/typography';

interface Props {
  visible: boolean;
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
  title?: string;
}

const MONTHS_ES_LONG = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
// Spanish week order: Mon..Sun (ISO-style).
const WEEKDAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Returns the list of day-numbers to render in a 6-row calendar grid,
// padded at the start with nulls for leading blanks from prev month
// and at the end to fill the final row. Keeps layout stable (no jitter
// when switching months with different lengths).
function buildMonthGrid(month: Date): (number | null)[] {
  const first = startOfMonth(month);
  // JS getDay: 0=Sun..6=Sat. Shift to ISO: 0=Mon..6=Sun.
  const firstWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  // Always show 6 rows so sheet height doesn't flicker.
  while (cells.length < 42) cells.push(null);
  return cells;
}

export function DatePickerSheet({
  visible,
  value,
  onChange,
  onClose,
  title = 'Seleccionar fecha',
}: Props) {
  const insets = useSafeAreaInsets();
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(value));

  // When the sheet (re)opens with a different `value`, re-anchor the view
  // to the month of that value. We do this inline on visibility transition
  // via a derived check rather than useEffect to keep renders cheap.
  React.useEffect(() => {
    if (visible) {
      setViewMonth(startOfMonth(value));
    }
  }, [visible, value]);

  const today = useMemo(() => new Date(), []);
  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <View style={styles.handleZone}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.monthHeader}>
            <Pressable
              onPress={() => setViewMonth((m) => addMonths(m, -1))}
              hitSlop={10}
              style={styles.navBtn}
            >
              <ChevronLeft size={20} color="#000000" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.monthLabel}>
              {MONTHS_ES_LONG[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </Text>
            <Pressable
              onPress={() => setViewMonth((m) => addMonths(m, 1))}
              hitSlop={10}
              style={styles.navBtn}
            >
              <ChevronRight size={20} color="#000000" strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS_ES.map((w, i) => (
              <Text key={`${w}-${i}`} style={styles.weekdayLabel}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <View key={idx} style={styles.cellEmpty} />;
              }
              const cellDate = new Date(
                viewMonth.getFullYear(),
                viewMonth.getMonth(),
                day,
              );
              const isSelected = isSameDay(cellDate, value);
              const isToday = isSameDay(cellDate, today);
              return (
                <Pressable
                  key={idx}
                  style={styles.cell}
                  onPress={() => {
                    onChange(cellDate);
                    onClose();
                  }}
                >
                  <View
                    style={[
                      styles.cellBubble,
                      isSelected && styles.cellBubbleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        isToday && !isSelected && styles.cellTextToday,
                        isSelected && styles.cellTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CELL_SIZE = 38;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
  },
  title: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.2,
    paddingBottom: 8,
    textAlign: 'center',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  monthLabel: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    color: '#000000',
    letterSpacing: -0.3,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  weekdayLabel: {
    ...fontFamily.semibold,
    fontSize: fontSize[11],
    color: '#8E8E93',
    letterSpacing: 0.1,
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 12,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  cellBubble: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellBubbleSelected: {
    backgroundColor: '#000000',
  },
  cellText: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
  },
  cellTextToday: {
    ...fontFamily.bold,
    color: '#007AFF',
  },
  cellTextSelected: {
    ...fontFamily.semibold,
    color: '#FFFFFF',
  },
});
