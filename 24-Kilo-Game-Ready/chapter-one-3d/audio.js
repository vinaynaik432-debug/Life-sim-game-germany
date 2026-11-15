export class Ambience {
  constructor() { this.enabled=false; this.place='airport'; }
  async toggle() {
    if (!this.context) {
      this.context=new AudioContext();
      const ctx=this.context, buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);
      const samples=buffer.getChannelData(0);let v=0;
      for(let i=0;i<samples.length;i++){v=(v+.026*(Math.random()*2-1))/1.026;samples[i]=v;}
      this.noise=ctx.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;
      this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.level=ctx.createGain();this.level.gain.value=0;
      this.noise.connect(this.filter);this.filter.connect(this.level);this.level.connect(ctx.destination);this.noise.start();
    }
    this.enabled=!this.enabled;
    if(this.enabled) await this.context.resume();
    this.setPlace(this.place);return this.enabled;
  }
  setPlace(place){
    this.place=place;if(!this.context)return;
    const [cut,gain]={airport:[1150,.28],ride:[420,.52],room:[650,.14],home:[650,.12],street:[1350,.20],civic:[850,.12],office:[1000,.10],platform:[520,.28]}[place]||[650,.12];
    this.filter.frequency.setTargetAtTime(cut,this.context.currentTime,.3);
    this.level.gain.setTargetAtTime(this.enabled?gain:0,this.context.currentTime,.18);
  }
  chime(){
    if (!this.enabled || !this.context) return;
    const ctx=this.context,osc=ctx.createOscillator(),vol=ctx.createGain();osc.frequency.value=640;vol.gain.setValueAtTime(.023,ctx.currentTime);vol.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.26);osc.connect(vol);vol.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.3);
  }
}
