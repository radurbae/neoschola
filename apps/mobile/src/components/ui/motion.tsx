import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from "react-native";

export interface SpringPressableProps {
  children: React.ReactNode;
  onPress?: ((event: GestureResponderEvent) => void) | undefined;
  disabled?: boolean;
  accessibilityRole?: PressableProps["accessibilityRole"];
  accessibilityLabel?: string;
  accessibilityState?: PressableProps["accessibilityState"];
  hitSlop?: PressableProps["hitSlop"];
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  testID?: string;
  activeScale?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SpringPressable({
  children,
  onPress,
  disabled = false,
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityState,
  hitSlop,
  style,
  testID,
  activeScale = 0.975,
}: SpringPressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;
    setPressed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: activeScale,
        useNativeDriver: Platform.OS !== "web",
        speed: 20,
        bounciness: 4,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.94,
        duration: 100,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled) return;
    setPressed(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: Platform.OS !== "web",
        speed: 20,
        bounciness: 4,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  };

  const resolvedStyle = typeof style === "function" ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      hitSlop={hitSlop}
      testID={testID}
      style={[
        resolvedStyle,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

export interface FadeSlideViewProps {
  transitionKey?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FadeSlideView({
  transitionKey,
  children,
  style,
}: FadeSlideViewProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [transitionKey]);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
