import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ReminderInput } from '../components/ReminderInput';
import { ReminderItem } from '../components/ReminderItem';
import { usePlaceCandidates } from '../hooks/usePlaceCandidates';
import { useReminders } from '../hooks/useReminders';

export function HomeScreen() {
  const {
    reminders,
    isLoading,
    storageError,
    addReminder,
    updateReminder,
    deleteReminder,
  } = useReminders();

  usePlaceCandidates({
    isLoadingReminders: isLoading,
    reminders,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>THERE YOU GO</Text>
          <Text style={styles.title}>Don’t forget it.</Text>
          <Text style={styles.subtitle}>
            Keep a simple list for the next time you’re out.
          </Text>
          <ReminderInput disabled={isLoading} onAdd={addReminder} />
          {storageError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {storageError}
            </Text>
          ) : null}
        </View>

        <FlatList
          contentContainerStyle={[
            styles.listContent,
            reminders.length === 0 && styles.emptyListContent,
          ]}
          data={reminders}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(reminder) => reminder.id}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color="#6d6b65" />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nothing to remember yet</Text>
                <Text style={styles.emptyText}>
                  Add something above and it’ll be here when you need it.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <ReminderItem
              onDelete={deleteReminder}
              onEdit={updateReminder}
              reminder={item}
            />
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f6f2',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: 26,
    paddingHorizontal: 22,
  },
  eyebrow: {
    marginBottom: 10,
    color: '#76736a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    color: '#1f1e1a',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.1,
  },
  subtitle: {
    maxWidth: 320,
    marginTop: 8,
    marginBottom: 24,
    color: '#6d6b65',
    fontSize: 16,
    lineHeight: 23,
  },
  error: {
    marginTop: 10,
    color: '#a3312c',
    fontSize: 13,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  emptyListContent: {
    justifyContent: 'center',
  },
  emptyState: {
    paddingBottom: 64,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#3d3b36',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    maxWidth: 260,
    marginTop: 8,
    color: '#85827a',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
