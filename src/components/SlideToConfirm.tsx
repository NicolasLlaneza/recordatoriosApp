// Switch deslizable: se arrastra el pulgar hacia la derecha para marcar como
// hecho. Al confirmarse, la barra se pone verde. Usa Animated + PanResponder
// del core de React Native (sin dependencias nativas extra).
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

const THUMB = 52;
const PAD = 4;
const TRIGGER_RATIO = 0.7; // % del recorrido para confirmar

type Props = {
  done: boolean;
  doneLabel: string; // ej: "Hecho 23:14"
  idleLabel?: string;
  onConfirm: () => void;
  onUndo: () => void;
};

export default function SlideToConfirm({
  done,
  doneLabel,
  idleLabel = 'Deslizá para marcar como hecho',
  onConfirm,
  onUndo,
}: Props) {
  const [trackW, setTrackW] = useState(0);
  const maxXRef = useRef(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTrackW(w);
    maxXRef.current = Math.max(0, w - THUMB - PAD * 2);
  };

  // Reset del pulgar cuando pasa a "no hecho" (ej: se deshizo o cambió el día).
  useEffect(() => {
    if (!done) translateX.setValue(0);
  }, [done, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => {
        const max = maxXRef.current;
        const x = Math.min(Math.max(0, g.dx), max);
        translateX.setValue(x);
      },
      onPanResponderRelease: (_e, g) => {
        const max = maxXRef.current;
        const x = Math.min(Math.max(0, g.dx), max);
        if (max > 0 && x >= max * TRIGGER_RATIO) {
          Animated.timing(translateX, {
            toValue: max,
            duration: 120,
            useNativeDriver: true,
          }).start(() => onConfirm());
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  if (done) {
    return (
      <Pressable
        onPress={onUndo}
        style={[styles.track, styles.trackDone]}
        accessibilityRole="button"
        accessibilityLabel={`${doneLabel}. Tocá para deshacer`}
      >
        <View style={[styles.thumb, styles.thumbDone]}>
          <Text style={styles.thumbIcon}>✓</Text>
        </View>
        <Text style={styles.doneText} numberOfLines={1}>
          {doneLabel}
        </Text>
        <Text style={styles.undoHint}>deshacer</Text>
      </Pressable>
    );
  }

  // Opacidad del fondo verde que crece a medida que se arrastra.
  const fillOpacity = translateX.interpolate({
    inputRange: [0, Math.max(1, maxXRef.current)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.track} onLayout={onLayout}>
      <Animated.View style={[styles.fill, { opacity: fillOpacity }]} />
      <Text style={styles.idleText} numberOfLines={1}>
        {idleLabel}
      </Text>
      <Animated.View
        style={[styles.thumb, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <Text style={styles.thumbIcon}>›</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: THUMB + PAD * 2,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    justifyContent: 'center',
    paddingHorizontal: PAD,
    overflow: 'hidden',
  },
  trackDone: {
    backgroundColor: colors.greenDark,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.greenDark,
    borderRadius: radius.pill,
  },
  idleText: {
    position: 'absolute',
    alignSelf: 'center',
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    left: THUMB + PAD * 2,
    right: spacing.md,
    textAlign: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  thumbDone: {
    backgroundColor: colors.green,
  },
  thumbIcon: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  doneText: {
    flex: 1,
    color: '#EAFBF0',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: spacing.md,
  },
  undoHint: {
    color: '#CFEBD9',
    fontSize: 12,
    fontWeight: '600',
    marginRight: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
