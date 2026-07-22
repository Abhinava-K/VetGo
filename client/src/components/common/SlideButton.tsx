import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SlideButtonProps {
  onSlideComplete: () => void;
  title: string;
  color: string;
  icon: string;
}

export default function SlideButton({ onSlideComplete, title, color, icon }: SlideButtonProps) {
  const pan = useRef(new Animated.Value(0)).current;
  const [completed, setCompleted] = useState(false);
  const containerWidth = useRef(0);
  const buttonWidth = 50;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Stop any active animations
        pan.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (completed) return;
        const maxSlide = containerWidth.current - buttonWidth;
        let newX = gestureState.dx;
        if (newX < 0) newX = 0;
        if (newX > maxSlide) newX = maxSlide;
        pan.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (completed) return;
        const maxSlide = containerWidth.current - buttonWidth;
        // Require sliding 75% of container width to activate
        if (gestureState.dx >= maxSlide * 0.75) {
          Animated.timing(pan, {
            toValue: maxSlide,
            duration: 100,
            useNativeDriver: false,
          }).start(() => {
            setCompleted(true);
            onSlideComplete();
            // Reset slider after a brief delay
            setTimeout(() => {
              Animated.spring(pan, {
                toValue: 0,
                tension: 40,
                friction: 7,
                useNativeDriver: false,
              }).start(() => setCompleted(false));
            }, 1200);
          });
        } else {
          // Snap back
          Animated.spring(pan, {
            toValue: 0,
            tension: 40,
            friction: 7,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View 
      style={[styles.container, { borderColor: color, backgroundColor: `${color}0A` }]}
      onLayout={(e) => {
        containerWidth.current = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.sliderButton,
          {
            backgroundColor: color,
            transform: [{ translateX: pan }],
          },
        ]}
      >
        <Ionicons name={icon as any} size={20} color="#FFFFFF" />
      </Animated.View>
      <Text style={[styles.text, { color }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  sliderButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  text: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    zIndex: 1,
  },
});
