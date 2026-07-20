import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TabButton } from './TabButton';
import { createSvgPath } from './animations';
import {
  TAB_BAR_HEIGHT,
  BUBBLE_SIZE,
  DIP_WIDTH,
  DIP_HEIGHT,
  SPRING_CONFIG,
  DEFAULT_TABS,
} from './constants';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const AnimatedTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const tabWidth = screenWidth / state.routes.length;

  const activeIndex = state.index;
  const activeX = useSharedValue((activeIndex + 0.5) * tabWidth);
  const bubbleScale = useSharedValue(1);
  const bubbleY = useSharedValue(-15);

  useEffect(() => {
    const targetX = (activeIndex + 0.5) * tabWidth;
    activeX.value = withSpring(targetX, SPRING_CONFIG);

    // Micro-interactions for bubble bounce & icon scale
    bubbleScale.value = withSequence(
      withTiming(0.88, { duration: 100 }),
      withSpring(1.08, SPRING_CONFIG),
      withSpring(1, SPRING_CONFIG)
    );
    bubbleY.value = withSequence(
      withTiming(-19, { duration: 120 }),
      withSpring(-15, SPRING_CONFIG)
    );
  }, [activeIndex, tabWidth]);

  const bottomInset = Math.max(insets.bottom, 0);
  const totalBarHeight = TAB_BAR_HEIGHT + bottomInset;
  const svgFillHeight = totalBarHeight + 40;

  const animatedPathProps = useAnimatedProps(() => {
    if (!Svg || !AnimatedPath) return {};
    const path = createSvgPath(
      screenWidth,
      svgFillHeight,
      activeX.value,
      DIP_WIDTH,
      DIP_HEIGHT
    );
    return { d: path };
  });

  const bubbleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: activeX.value - BUBBLE_SIZE / 2 },
        { translateY: bubbleY.value },
        { scale: bubbleScale.value },
      ] as const,
    };
  });

  const activeRoute = state.routes[activeIndex];
  const activeTabMeta =
    DEFAULT_TABS.find((t) => t.name === activeRoute?.name) ||
    DEFAULT_TABS[activeIndex] ||
    DEFAULT_TABS[0];

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: bottomInset,
          height: totalBarHeight,
        },
      ]}
    >
      {/* SVG Curved Background with Cutout Dip */}
      {Svg && AnimatedPath ? (
        <Svg
          width={screenWidth}
          height={svgFillHeight}
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        >
          <AnimatedPath
            animatedProps={animatedPathProps}
            fill="#111111"
          />
        </Svg>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111111', borderTopLeftRadius: 20, borderTopRightRadius: 20 }]} />
      )}

      {/* Floating Active Circular Bubble */}
      <Animated.View style={[styles.bubble, bubbleAnimatedStyle]}>
        <View style={styles.bubbleInner}>
          <Ionicons
            name={(activeTabMeta.activeIcon || 'map') as any}
            size={24}
            color="#FFFFFF"
          />
        </View>
      </Animated.View>

      {/* Tab Buttons Row */}
      <View style={styles.tabButtonsRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tabMeta =
            DEFAULT_TABS.find((t) => t.name === route.name) ||
            DEFAULT_TABS[index] || {
              label: route.name,
              icon: 'ellipse-outline',
              activeIcon: 'ellipse',
            };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TabButton
              key={route.key}
              label={options.tabBarLabel?.toString() || options.title || tabMeta.label}
              icon={tabMeta.icon}
              activeIcon={tabMeta.activeIcon}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  tabButtonsRow: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
  },
  bubble: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#27272A',
  },
  bubbleInner: {
    width: '100%',
    height: '100%',
    borderRadius: BUBBLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
