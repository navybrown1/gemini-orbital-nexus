import { clamp } from "../simulation/flight";

export class FlightAudio {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private noise: AudioBufferSourceNode | null = null;

  async enable() {
    if (!this.context) {
      const context = new AudioContext();
      this.context = context;
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
      this.gain = gain;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 180;
      filter.connect(gain);
      const oscillator = context.createOscillator();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = 40;
      oscillator.connect(filter);
      oscillator.start();
      this.oscillator = oscillator;
      const buffer = context.createBuffer(
        1,
        context.sampleRate * 2,
        context.sampleRate,
      );
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++)
        channel[i] = Math.random() * 2 - 1;
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noise.connect(filter);
      noise.start();
      this.noise = noise;
    }
    await this.context.resume();
  }

  update(throttle: number) {
    if (!this.context || !this.gain) return;
    this.gain.gain.setTargetAtTime(
      clamp(throttle, 0, 1) * 0.14,
      this.context.currentTime,
      0.12,
    );
    this.oscillator?.frequency.setTargetAtTime(
      32 + throttle * 28,
      this.context.currentTime,
      0.12,
    );
  }

  dispose() {
    this.oscillator?.stop();
    this.noise?.stop();
    void this.context?.close();
    this.context = null;
    this.gain = null;
    this.oscillator = null;
    this.noise = null;
  }
}
