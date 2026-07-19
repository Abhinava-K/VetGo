import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SPRING_CONFIG } from './constants';

interface TabButtonProps {
  label: string;
  icon: string;
  activeIcon: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export const TabButton: React.FC<TabButtonProps> = ({
  label,
  icon,
  activeIcon,
  isFocused,
  onPress,
  onLongPress,
}) => {
  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 0 : 0.75, { duration: 200 }),
      transform: [
        {
          scale: withSpring(isFocused ? 0.6 : 1, SPRING_CONFIG),
        },
        {
          translateY: withSpring(isFocused ? 10 : 0, SPRING_CONFIG),
        },
      ],
    };
  });

  const labelAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0.6, { duration: 200 }),
      transform: [
        {
          scale: withSpring(isFocused ? 1.05 : 0.95, SPRING_CONFIG),
        },
      ],
    };
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.container}
      activeOpacity={0.8}
    >
      <View style={styles.iconWrapper}>
        <Animated.View style={iconAnimatedStyle}>
          <Ionicons
            name={(isFocused ? activeIcon : icon) as any}
            size={22}
            color="#FFFFFF"
          />
        </Animated.View>
      </View>
      <Animated.Text style={[styles.label, labelAnimatedStyle]}>
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconWrapper: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
});
