// Switch deslizable: se arrastra el pulgar hacia la derecha para marcar como
// hecho. Al confirmarse, la barra se pone verde. Para deshacer hay un botón
// aparte (con confirmación en el componente padre), así un toque accidental no
// borra el registro. Usa Animated + PanResponder del core de React Native.
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
  doneLabel: string; // ej: "Hecho a las 23:14"
  note?: string; // ej: "Deshecho a las 23:20" (cuando está pendiente tras un undo)
  idleLabel?: string;
  onConfirm: () => void;
  onUndo: () => void; // el padre muestra la confirmación
};

export default function SlideToConfirm({
  done,
  doneLabel,
  note,
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
      <View>
        <View style={[styles.track, styles.trackDone]}>
          <View style={[styles.thumb, styles.thumbDone]}>
            <Text style={styles.thumbIcon}>✓</Text>
          </View>
          <Text style={styles.doneText} numberOfLines={1}>
            {doneLabel}
          </Text>
        </View>
        <Pressable
          onPress={onUndo}
          style={styles.undoBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Deshacer"
        >
          <Text style={styles.undoBtnText}>↩  Deshacer</Text>
        </Pressable>
      </View>
    );
  }

  const fillOpacity = translateX.interpolate({
    inputRange: [0, Math.max(1, maxXRef.current)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View>
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
      {note ? <Text style={styles.note}>{note}</Text> : null}
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
  undoBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  undoBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
    fontStyle: 'italic',
  },
});
