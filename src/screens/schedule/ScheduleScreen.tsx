/**
 * ScheduleScreen — main calendar/schedule view.
 *
 * Tabs: Day | Week | Month | Agenda
 * Subscribes to Firestore events on mount; populates the events store.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { addDays, subDays, addWeeks, subWeeks, format } from 'date-fns';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { ScheduleStackParamList } from '../../navigation/stacks/ScheduleStack';
import { CalendarEvent } from '../../types';
import { useEventsStore } from '../../store/eventsStore';
import { useAuthStore, selectUserId } from '../../store/authStore';
import { subscribeToEvents } from '../../services/eventsService';
import {
  formatDate,
  formatTime,
  getWeekDates,
  getShortDayName,
  isToday,
  toLocalDateString,
  getRelativeDayLabel,
} from '../../utils/dateUtils';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type ViewMode = 'day' | 'week' | 'month' | 'agenda';
type ScheduleNavProp = StackNavigationProp<ScheduleStackParamList, 'Schedule'>;

interface Props {
  navigation: ScheduleNavProp;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HOUR_HEIGHT = 60; // px per hour in day view
const TIMELINE_START_HOUR = 0;
const TIMELINE_HOURS = 24;
const TIMELINE_LABEL_WIDTH = 52;

const TABS: { id: ViewMode; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'agenda', label: 'Agenda' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayDateString(): string {
  return toLocalDateString(new Date());
}

function dateToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function currentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function eventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  return events.filter((e) => {
    const start = toLocalDateString(new Date(e.startTime));
    const end = toLocalDateString(new Date(e.endTime));
    return start === dateStr || (e.allDay && start <= dateStr && end >= dateStr);
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ── EventBlock (Day View) ──────────────────────────────────────────────────

interface EventBlockProps {
  event: CalendarEvent;
  onPress: () => void;
}

function EventBlock({ event, onPress }: EventBlockProps): React.JSX.Element {
  const startMin = dateToMinutes(event.startTime);
  const endMin = dateToMinutes(event.endTime);
  const durationMin = Math.max(endMin - startMin, 30);
  const top = (startMin / 60) * HOUR_HEIGHT;
  const height = (durationMin / 60) * HOUR_HEIGHT;

  return (
    <TouchableOpacity
      style={[
        styles.eventBlock,
        {
          top,
          height: Math.max(height, 28),
          backgroundColor: event.color + 'CC',
          borderLeftColor: event.color,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.eventBlockTitle} numberOfLines={1}>
        {event.title}
      </Text>
      {height >= 40 && (
        <Text style={styles.eventBlockTime} numberOfLines={1}>
          {formatTime(event.startTime)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── CurrentTimeLine ────────────────────────────────────────────────────────

function CurrentTimeLine(): React.JSX.Element {
  const [minutes, setMinutes] = useState(currentTimeMinutes());

  useEffect(() => {
    const id = setInterval(() => setMinutes(currentTimeMinutes()), 60_000);
    return () => clearInterval(id);
  }, []);

  const top = (minutes / 60) * HOUR_HEIGHT - 1;

  return (
    <View style={[styles.currentTimeLine, { top }]} pointerEvents="none">
      <View style={styles.currentTimeDot} />
      <View style={styles.currentTimeLineBar} />
    </View>
  );
}

// ── AgendaItem ─────────────────────────────────────────────────────────────

interface AgendaItemProps {
  event: CalendarEvent;
  onPress: () => void;
}

function AgendaItem({ event, onPress }: AgendaItemProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.agendaItem} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.agendaDot, { backgroundColor: event.color }]} />
      <View style={styles.agendaContent}>
        <Text style={styles.agendaTitle} numberOfLines={1}>{event.title}</Text>
        {event.allDay ? (
          <Text style={styles.agendaTime}>All day</Text>
        ) : (
          <Text style={styles.agendaTime}>
            {formatTime(event.startTime)} – {formatTime(event.endTime)}
          </Text>
        )}
        {event.description != null && event.description.trim().length > 0 && (
          <Text style={styles.agendaDesc} numberOfLines={1}>{event.description}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ScheduleScreen({ navigation }: Props): React.JSX.Element {
  const userId = useAuthStore(selectUserId);
  const { events, setEvents, loading, setLoading } = useEventsStore();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(todayDateString());
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());

  // Scroll ref for day-view timeline auto-scroll to current hour
  const dayScrollRef = useRef<ScrollView>(null);

  // ---------------------------------------------------------------------------
  // Subscribe to events
  // ---------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      setLoading(true);
      const unsub = subscribeToEvents(userId, (incoming) => {
        setEvents(incoming);
        setLoading(false);
      });
      return () => unsub();
    }, [userId, setEvents, setLoading]),
  );

  // Auto-scroll day view to current hour on mount / date change
  useEffect(() => {
    if (viewMode === 'day' && isToday(selectedDate)) {
      const scrollTo = Math.max(0, (currentTimeMinutes() / 60 - 1) * HOUR_HEIGHT);
      setTimeout(() => {
        dayScrollRef.current?.scrollTo({ y: scrollTo, animated: true });
      }, 300);
    }
  }, [viewMode, selectedDate]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const weekDates = useMemo(() => getWeekDates(weekAnchor), [weekAnchor]);

  // Events indexed by date string for quick lookup
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const key = toLocalDateString(new Date(e.startTime));
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  // Marked dates for react-native-calendars
  const markedDates = useMemo(() => {
    const result: Record<string, object> = {};
    for (const [dateStr, dayEvents] of Object.entries(eventsByDate)) {
      const dots = dayEvents.slice(0, 3).map((e) => ({ color: e.color, key: e.id }));
      result[dateStr] = {
        dots,
        selected: dateStr === selectedDate,
        selectedColor: colors.primary,
      };
    }
    // Ensure the selected date is always marked even with no events
    if (!result[selectedDate]) {
      result[selectedDate] = { selected: true, selectedColor: colors.primary };
    }
    return result;
  }, [eventsByDate, selectedDate]);

  // Agenda sections: only dates that have events, sorted, with today/tomorrow labels
  const agendaSections = useMemo(() => {
    const sorted = Object.keys(eventsByDate).sort();
    return sorted.map((dateStr) => ({
      dateStr,
      label: getRelativeDayLabel(dateStr, 'EEE MMM d'),
      events: [...(eventsByDate[dateStr] ?? [])].sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      ),
    }));
  }, [eventsByDate]);

  const selectedDateEvents = useMemo(
    () => eventsForDate(events, selectedDate),
    [events, selectedDate],
  );

  // ---------------------------------------------------------------------------
  // Header label
  // ---------------------------------------------------------------------------

  const headerLabel = useMemo(() => {
    if (viewMode === 'day') return formatDate(selectedDate, 'EEE, MMM d');
    if (viewMode === 'week') {
      const first = weekDates[0];
      const last = weekDates[6];
      if (format(first, 'MMM') === format(last, 'MMM')) {
        return `${format(first, 'MMM d')} – ${format(last, 'd, yyyy')}`;
      }
      return `${format(first, 'MMM d')} – ${format(last, 'MMM d, yyyy')}`;
    }
    if (viewMode === 'month') return formatDate(selectedDate, 'MMMM yyyy');
    return 'Agenda';
  }, [viewMode, selectedDate, weekDates]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  function navigatePrev() {
    if (viewMode === 'day') {
      setSelectedDate(toLocalDateString(subDays(new Date(selectedDate), 1)));
    } else if (viewMode === 'week') {
      setWeekAnchor((d) => subWeeks(d, 1));
    }
  }

  function navigateNext() {
    if (viewMode === 'day') {
      setSelectedDate(toLocalDateString(addDays(new Date(selectedDate), 1)));
    } else if (viewMode === 'week') {
      setWeekAnchor((d) => addWeeks(d, 1));
    }
  }

  function goToToday() {
    setSelectedDate(todayDateString());
    setWeekAnchor(new Date());
  }

  // ---------------------------------------------------------------------------
  // Render views
  // ---------------------------------------------------------------------------

  function renderDayView(): React.JSX.Element {
    const dayEvents = selectedDateEvents.filter((e) => !e.allDay);
    const allDayEvents = selectedDateEvents.filter((e) => e.allDay);
    const showToday = isToday(selectedDate);

    return (
      <View style={styles.dayContainer}>
        {/* Swipe nav bar */}
        <View style={styles.dayNavBar}>
          <TouchableOpacity style={styles.navArrow} onPress={navigatePrev}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <Text style={[styles.dayNavLabel, showToday && styles.dayNavLabelToday]}>
              {formatDate(selectedDate, 'EEEE, MMMM d')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navArrow} onPress={navigateNext}>
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* All-day events strip */}
        {allDayEvents.length > 0 && (
          <View style={styles.allDayStrip}>
            <Text style={styles.allDayLabel}>All-day</Text>
            <View style={styles.allDayEvents}>
              {allDayEvents.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.allDayChip, { backgroundColor: e.color + '22', borderColor: e.color }]}
                  onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
                  activeOpacity={0.75}
                >
                  <View style={[styles.allDayChipDot, { backgroundColor: e.color }]} />
                  <Text style={[styles.allDayChipText, { color: e.color }]} numberOfLines={1}>
                    {e.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Hourly timeline */}
        <ScrollView ref={dayScrollRef} showsVerticalScrollIndicator={false}>
          <View style={styles.timeline}>
            {/* Hour labels + grid lines */}
            {Array.from({ length: TIMELINE_HOURS }, (_, i) => {
              const hour = TIMELINE_START_HOUR + i;
              const label =
                hour === 0 ? '12 AM' :
                hour < 12 ? `${hour} AM` :
                hour === 12 ? '12 PM' :
                `${hour - 12} PM`;
              return (
                <View key={hour} style={[styles.hourRow, { top: i * HOUR_HEIGHT }]}>
                  <Text style={styles.hourLabel}>{label}</Text>
                  <View style={styles.hourLine} />
                </View>
              );
            })}

            {/* Event blocks */}
            <View style={[styles.eventsColumn, { marginLeft: TIMELINE_LABEL_WIDTH }]}>
              {dayEvents.map((e) => (
                <EventBlock
                  key={e.id}
                  event={e}
                  onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
                />
              ))}
              {/* Current time indicator */}
              {showToday && <CurrentTimeLine />}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  function renderWeekView(): React.JSX.Element {
    return (
      <View style={styles.weekContainer}>
        {/* Swipe nav */}
        <View style={styles.dayNavBar}>
          <TouchableOpacity style={styles.navArrow} onPress={navigatePrev}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.dayNavLabel}>{headerLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navArrow} onPress={navigateNext}>
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Day columns */}
        <View style={styles.weekGrid}>
          {weekDates.map((d, colIdx) => {
            const dateStr = toLocalDateString(d);
            const todayFlag = isToday(d);
            const selected = dateStr === selectedDate;
            const colEvents = eventsByDate[dateStr] ?? [];
            // Day letter: Mon-Sun order — weekDates starts on Sunday (index 0)
            const dayLetter = getShortDayName(d.getDay()).charAt(0);

            return (
              <TouchableOpacity
                key={colIdx}
                style={styles.weekColumn}
                onPress={() => {
                  setSelectedDate(dateStr);
                  setViewMode('day');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.weekDayLetter}>{dayLetter}</Text>
                <View
                  style={[
                    styles.weekDateCircle,
                    todayFlag && styles.weekDateCircleToday,
                    selected && !todayFlag && styles.weekDateCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.weekDateNumber,
                      (todayFlag || selected) && styles.weekDateNumberActive,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                {/* Event dots */}
                <View style={styles.weekEventDots}>
                  {colEvents.slice(0, 4).map((e) => (
                    <View key={e.id} style={[styles.weekEventBar, { backgroundColor: e.color }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day events list below the grid */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {selectedDateEvents.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyDayText}>No events on {formatDate(selectedDate, 'EEE, MMM d')}</Text>
            </View>
          ) : (
            <View style={styles.weekEventList}>
              {selectedDateEvents.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.weekEventRow}
                  onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
                  activeOpacity={0.75}
                >
                  <View style={[styles.weekEventRowDot, { backgroundColor: e.color }]} />
                  <View style={styles.weekEventRowContent}>
                    <Text style={styles.weekEventRowTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.weekEventRowTime}>
                      {e.allDay ? 'All day' : `${formatTime(e.startTime)} – ${formatTime(e.endTime)}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  function renderMonthView(): React.JSX.Element {
    return (
      <View style={styles.monthContainer}>
        <Calendar
          current={selectedDate}
          onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
          markingType="multi-dot"
          markedDates={markedDates}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.background,
            textSectionTitleColor: colors.textSecondary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.white,
            todayTextColor: colors.primary,
            dayTextColor: colors.textPrimary,
            textDisabledColor: colors.textMuted,
            dotColor: colors.primary,
            selectedDotColor: colors.white,
            arrowColor: colors.primary,
            monthTextColor: colors.textPrimary,
            indicatorColor: colors.primary,
            textDayFontSize: typography.fontSize.sm,
            textMonthFontSize: typography.fontSize.base,
            textMonthFontWeight: typography.fontWeight.semiBold,
            textDayHeaderFontSize: typography.fontSize.xs,
          }}
        />

        {/* Events for selected date */}
        <View style={styles.monthSelectedHeader}>
          <Text style={styles.monthSelectedLabel}>
            {getRelativeDayLabel(selectedDate, 'EEEE, MMMM d')}
          </Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.monthEventScroll}>
          {selectedDateEvents.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyDayText}>No events</Text>
            </View>
          ) : (
            selectedDateEvents.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.weekEventRow}
                onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
                activeOpacity={0.75}
              >
                <View style={[styles.weekEventRowDot, { backgroundColor: e.color }]} />
                <View style={styles.weekEventRowContent}>
                  <Text style={styles.weekEventRowTitle} numberOfLines={1}>{e.title}</Text>
                  <Text style={styles.weekEventRowTime}>
                    {e.allDay ? 'All day' : `${formatTime(e.startTime)} – ${formatTime(e.endTime)}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  function renderAgendaView(): React.JSX.Element {
    type AgendaRow =
      | { type: 'header'; id: string; label: string }
      | { type: 'event'; id: string; event: CalendarEvent };

    const rows: AgendaRow[] = [];
    for (const section of agendaSections) {
      rows.push({ type: 'header', id: `h-${section.dateStr}`, label: section.label });
      for (const e of section.events) {
        rows.push({ type: 'event', id: e.id, event: e });
      }
    }

    if (rows.length === 0) {
      return (
        <View style={styles.agendaEmpty}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
          <Text style={styles.agendaEmptyText}>No upcoming events</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.agendaList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.agendaDateHeader}>
                <Text style={styles.agendaDateHeaderText}>{item.label}</Text>
              </View>
            );
          }
          return (
            <AgendaItem
              event={item.event}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.event.id })}
            />
          );
        }}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Full render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarTitle}>Schedule</Text>
          <Text style={styles.topBarLabel} numberOfLines={1}>{headerLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.todayButton}
          onPress={goToToday}
          activeOpacity={0.75}
        >
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab selector ── */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = viewMode === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setViewMode(tab.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content ── */}
      {loading && events.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'agenda' && renderAgendaView()}
        </View>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('CreateEvent', {
            defaultDate: selectedDate,
          })
        }
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  topBarLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  topBarTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    lineHeight: typography.fontSize.xxl * 1.2,
  },
  topBarLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  todayButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  todayButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  tabActive: {
    backgroundColor: colors.white,
    ...shadows.small,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semiBold,
  },

  // ── Loading ───────────────────────────────────────────────────────────────
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Content wrapper ───────────────────────────────────────────────────────
  content: {
    flex: 1,
  },

  // ── Day view ──────────────────────────────────────────────────────────────
  dayContainer: {
    flex: 1,
  },
  dayNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dayNavLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
  },
  dayNavLabelToday: {
    color: colors.primary,
  },
  navArrow: {
    padding: spacing.xs,
  },
  allDayStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  allDayLabel: {
    width: TIMELINE_LABEL_WIDTH - spacing.md,
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    paddingTop: 4,
  },
  allDayEvents: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  allDayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 4,
  },
  allDayChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  allDayChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  timeline: {
    position: 'relative',
    height: TIMELINE_HOURS * HOUR_HEIGHT + 20,
    marginBottom: spacing.xxl,
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: HOUR_HEIGHT,
  },
  hourLabel: {
    width: TIMELINE_LABEL_WIDTH,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  eventsColumn: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: TIMELINE_LABEL_WIDTH,
    bottom: 0,
  },
  eventBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  eventBlockTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
  },
  eventBlockTime: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    marginLeft: -5,
    zIndex: 11,
  },
  currentTimeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: colors.error,
  },

  // ── Week view ─────────────────────────────────────────────────────────────
  weekContainer: {
    flex: 1,
  },
  weekGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  weekColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekDayLetter: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  weekDateCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDateCircleToday: {
    backgroundColor: colors.primary,
  },
  weekDateCircleSelected: {
    backgroundColor: colors.primaryShades[100],
  },
  weekDateNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  weekDateNumberActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semiBold,
  },
  weekEventDots: {
    marginTop: 4,
    gap: 2,
    width: '90%',
  },
  weekEventBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  weekEventList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  weekEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    ...shadows.small,
  },
  weekEventRowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  weekEventRowContent: {
    flex: 1,
  },
  weekEventRowTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
  },
  weekEventRowTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Month view ────────────────────────────────────────────────────────────
  monthContainer: {
    flex: 1,
  },
  monthSelectedHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  monthSelectedLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
  },
  monthEventScroll: {
    paddingHorizontal: spacing.lg,
  },

  // ── Shared empty state ────────────────────────────────────────────────────
  emptyDay: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },

  // ── Agenda view ───────────────────────────────────────────────────────────
  agendaList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  agendaDateHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  agendaDateHeaderText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    ...shadows.small,
  },
  agendaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  agendaContent: {
    flex: 1,
  },
  agendaTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
  },
  agendaTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  agendaDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  agendaEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
    gap: spacing.md,
  },
  agendaEmptyText: {
    fontSize: typography.fontSize.base,
    color: colors.textMuted,
  },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.large,
  },
});
