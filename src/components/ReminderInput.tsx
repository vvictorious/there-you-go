import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type ReminderInputProps = {
  disabled?: boolean;
  onAdd: (text: string) => void;
};

export function ReminderInput({ disabled = false, onAdd }: ReminderInputProps) {
  const [text, setText] = useState('');
  const canSubmit = !disabled && text.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    onAdd(text);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="New reminder"
        editable={!disabled}
        onChangeText={setText}
        onSubmitEditing={handleSubmit}
        placeholder="What don’t you want to forget?"
        placeholderTextColor="#8a8985"
        returnKeyType="done"
        selectionColor="#272621"
        style={styles.input}
        submitBehavior="submit"
        value={text}
      />
      <Pressable
        accessibilityLabel="Add reminder"
        accessibilityRole="button"
        disabled={!canSubmit}
        hitSlop={6}
        onPress={handleSubmit}
        style={({ pressed }) => [
          styles.addButton,
          !canSubmit && styles.addButtonDisabled,
          pressed && canSubmit && styles.addButtonPressed,
        ]}
      >
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    minHeight: 56,
    flex: 1,
    paddingHorizontal: 18,
    borderColor: '#dedcd5',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    color: '#1f1e1a',
    fontSize: 17,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#272621',
  },
  addButtonDisabled: {
    backgroundColor: '#c9c7c0',
  },
  addButtonPressed: {
    opacity: 0.75,
  },
  addButtonText: {
    marginTop: -2,
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 38,
  },
});
