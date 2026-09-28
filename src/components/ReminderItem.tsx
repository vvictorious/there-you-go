import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Reminder } from '../models/Reminder';

const DELETE_ACTION_WIDTH = 88;

type ReminderItemProps = {
  reminder: Reminder;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
};

export function ReminderItem({
  reminder,
  onDelete,
  onEdit,
}: ReminderItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(reminder.text);
  const translation = useRef(new Animated.Value(0)).current;
  const hasCommitted = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(reminder.text);
    }
  }, [isEditing, reminder.text]);

  const settleSwipe = (toValue: number) => {
    Animated.spring(translation, {
      toValue,
      useNativeDriver: true,
      damping: 22,
      stiffness: 230,
      mass: 0.8,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !isEditing &&
          gestureState.dx < -6 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          translation.setValue(
            Math.max(-DELETE_ACTION_WIDTH, Math.min(0, gestureState.dx)),
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldReveal =
            gestureState.dx < -DELETE_ACTION_WIDTH / 2 || gestureState.vx < -0.5;
          settleSwipe(shouldReveal ? -DELETE_ACTION_WIDTH : 0);
        },
        onPanResponderTerminate: () => settleSwipe(0),
      }),
    [isEditing, translation],
  );

  const startEditing = () => {
    settleSwipe(0);
    hasCommitted.current = false;
    setDraft(reminder.text);
    setIsEditing(true);
  };

  const commitEdit = () => {
    if (hasCommitted.current) {
      return;
    }

    hasCommitted.current = true;
    setIsEditing(false);
    onEdit(reminder.id, draft);
  };

  return (
    <View style={styles.swipeContainer}>
      <Pressable
        accessibilityLabel={`Delete ${reminder.text}`}
        accessibilityRole="button"
        onPress={() => onDelete(reminder.id)}
        style={({ pressed }) => [
          styles.deleteAction,
          pressed && styles.deleteActionPressed,
        ]}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>

      <Animated.View
        style={[styles.item, { transform: [{ translateX: translation }] }]}
        {...panResponder.panHandlers}
      >
        {isEditing ? (
          <TextInput
            accessibilityLabel={`Edit ${reminder.text}`}
            autoFocus
            onBlur={commitEdit}
            onChangeText={setDraft}
            onSubmitEditing={commitEdit}
            returnKeyType="done"
            selectTextOnFocus
            selectionColor="#272621"
            style={styles.editInput}
            value={draft}
          />
        ) : (
          <Pressable
            accessibilityHint="Double tap to edit. Swipe left for delete."
            accessibilityRole="button"
            onPress={startEditing}
            style={({ pressed }) => [
              styles.itemContent,
              pressed && styles.itemPressed,
            ]}
          >
            <Text style={styles.reminderText}>{reminder.text}</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    minHeight: 64,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#d94b45',
  },
  deleteAction: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: DELETE_ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d94b45',
  },
  deleteActionPressed: {
    backgroundColor: '#bd3934',
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  item: {
    minHeight: 64,
    justifyContent: 'center',
    borderColor: '#e4e2dc',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  itemContent: {
    minHeight: 62,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  itemPressed: {
    backgroundColor: '#f7f6f2',
  },
  reminderText: {
    color: '#272621',
    fontSize: 17,
    lineHeight: 23,
  },
  editInput: {
    minHeight: 62,
    paddingHorizontal: 18,
    color: '#272621',
    fontSize: 17,
  },
});
