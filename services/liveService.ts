import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';

// Helper types for the Live Service
export type ConnectionCallback = (status: 'connected' | 'disconnected' | 'error', error?: any) => void;
export type VolumeCallback = (volume: number) => void;

class LiveService {
  private ai: GoogleGenAI | null = null;
  private session: any = null; // Holds the active session
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  
  constructor() {}

  async connect(onStatusChange: ConnectionCallback, onVolume: VolumeCallback) {
    try {
      // CRITICAL: Create the instance INSIDE the connect method.
      // This ensures we use the API key that was just selected by the user.
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const outputNode = this.outputAudioContext.createGain();
      outputNode.connect(this.outputAudioContext.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      onStatusChange('connected'); 

      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
             // Setup Input Stream
             if (!this.inputAudioContext) return;
             
             this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
             this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
             
             this.processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Calculate volume for visualizer
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                const volume = Math.sqrt(sum / inputData.length);
                onVolume(volume);

                const pcmBlob = this.createBlob(inputData);
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
             };

             this.inputSource.connect(this.processor);
             this.processor.connect(this.inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio && this.outputAudioContext) {
                this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                
                const audioBuffer = await this.decodeAudioData(
                  this.decode(base64Audio),
                  this.outputAudioContext,
                  24000,
                  1
                );

                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                source.addEventListener('ended', () => {
                  this.sources.delete(source);
                });

                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);
             }

             // Handle Interruptions
             if (message.serverContent?.interrupted) {
               this.sources.forEach(s => s.stop());
               this.sources.clear();
               this.nextStartTime = 0;
             }
          },
          onclose: () => {
            onStatusChange('disconnected');
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            onStatusChange('error', err);
          }
        }
      });

      this.session = await sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      onStatusChange('error', error);
      this.disconnect();
    }
  }

  disconnect() {
    // Cleanup resources
    if (this.session) {
        // No explicit close method on session object in current SDK, handled via closing context/stream
    }
    
    if (this.inputSource) {
        this.inputSource.disconnect();
        this.inputSource = null;
    }
    if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
    }
    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
        this.inputAudioContext.close();
        this.inputAudioContext = null;
    }
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
        this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    
    this.sources.forEach(s => s.stop());
    this.sources.clear();
    this.session = null;
  }

  async sendMessage(text: string) {
    if (this.session) {
      await this.session.send({ parts: [{ text }] });
    }
  }

  // --- Helpers ---

  private createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: this.encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}

export const liveService = new LiveService();