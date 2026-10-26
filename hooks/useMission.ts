import { useEffect, useRef, useState } from "react";
import { advanceFrame, command, createMission } from "../simulation/flight";
import type { FlightCommand, Preset } from "../simulation/flight";
import { FlightAudio } from "../services/audio";

export function useMission() {
  const mission = useRef(createMission());
  const audio = useRef<FlightAudio | null>(null);
  const speedRef = useRef(1),
    soundRef = useRef(false);
  const [snapshot, setSnapshot] = useState(() => ({ ...mission.current }));
  const [speed, setSpeed] = useState(1),
    [sound, setSound] = useState(false);
  const [audioError, setAudioError] = useState("");
  useEffect(() => {
    const engineAudio = new FlightAudio();
    audio.current = engineAudio;
    let frame = 0,
      previous = performance.now(),
      lastPublish = 0;
    const loop = (now: number) => {
      const dt = (now - previous) / 1000;
      previous = now;
      if (!document.hidden) {
        advanceFrame(mission.current, dt, speedRef.current);
        engineAudio.update(
          soundRef.current && !mission.current.paused
            ? mission.current.throttle
            : 0,
        );
        if (now - lastPublish >= 100) {
          setSnapshot({ ...mission.current });
          lastPublish = now;
        }
      } else engineAudio.update(0);
      frame = requestAnimationFrame(loop);
    };
    const visibility = () => {
      previous = performance.now();
      if (document.hidden) engineAudio.update(0);
    };
    document.addEventListener("visibilitychange", visibility);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      engineAudio.dispose();
      audio.current = null;
    };
  }, []);
  const act = (action: FlightCommand) => {
    command(mission.current, action);
    setSnapshot({ ...mission.current });
    if (action === "reset" || action === "abort") audio.current?.update(0);
  };
  const selectPreset = (preset: Preset) => {
    if (mission.current.mode !== "ready") return;
    mission.current = createMission(preset);
    setSnapshot({ ...mission.current });
  };
  const changeSpeed = (value: number) => {
    speedRef.current = value;
    setSpeed(value);
  };
  const toggleSound = async () => {
    if (soundRef.current) {
      soundRef.current = false;
      setSound(false);
      audio.current?.update(0);
      return;
    }
    try {
      await audio.current?.enable();
      soundRef.current = true;
      setSound(true);
      setAudioError("");
    } catch {
      setAudioError(
        "Audio is unavailable in this browser. The simulation is still running.",
      );
    }
  };
  return {
    mission,
    snapshot,
    act,
    selectPreset,
    speed,
    changeSpeed,
    sound,
    toggleSound,
    audioError,
  };
}
