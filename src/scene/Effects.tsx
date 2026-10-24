import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { HalfFloatType } from 'three'

/** Phones skip ambient occlusion, the most expensive pass. */
export function Effects({ high, night, mobile }: { high: boolean; night: boolean; mobile: boolean }) {
  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType}>
      {!mobile && (
      <N8AO
        aoRadius={1.1}
        distanceFalloff={0.5}
        intensity={2.6}
        aoSamples={high ? 16 : 10}
        denoiseSamples={high ? 8 : 6}
        denoiseRadius={12}
        halfRes
        depthAwareUpsampling
      />
      )}
      <Bloom mipmapBlur levels={5} intensity={night ? 0.3 : 0.22} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette offset={0.32} darkness={0.42} />
      <SMAA />
    </EffectComposer>
  )
}
