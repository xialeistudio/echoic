/**
 * Encode an AudioBuffer (or duck-typed {numberOfChannels, length, sampleRate, getChannelData})
 * into a WAV Blob (16-bit PCM, interleaved).
 */
export function encodeWav(buf) {
  const numCh = buf.numberOfChannels
  const sr = buf.sampleRate
  const len = buf.length
  const dataLen = len * numCh * 2 // 16-bit = 2 bytes per sample
  const ab = new ArrayBuffer(44 + dataLen)
  const v = new DataView(ab)

  function str(off, s) { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true)
  str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true)           // chunk size
  v.setUint16(20, 1, true)            // PCM
  v.setUint16(22, numCh, true)
  v.setUint32(24, sr, true)
  v.setUint32(28, sr * numCh * 2, true)
  v.setUint16(32, numCh * 2, true)
  v.setUint16(34, 16, true)           // bit depth
  str(36, 'data'); v.setUint32(40, dataLen, true)

  let off = 44
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(ch)[i]))
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      off += 2
    }
  }
  return new Blob([ab], { type: 'audio/wav' })
}

/**
 * Fetch and decode the full audio file once, cache in the provided ref.
 * Then slice [startSec, endSec] and return a WAV Blob.
 */
export async function getSegmentBlob(url, startSec, endSec, cacheRef) {
  if (!cacheRef.current) {
    const resp = await fetch(url)
    const arrayBuf = await resp.arrayBuffer()
    const ctx = new AudioContext()
    cacheRef.current = await ctx.decodeAudioData(arrayBuf)
    ctx.close()
  }

  const full = cacheRef.current
  const sr = full.sampleRate
  const s0 = Math.max(0, Math.floor(startSec * sr))
  const s1 = Math.min(full.length, Math.ceil(endSec * sr))
  const len = s1 - s0

  // Duck-type: no need to create an AudioBuffer instance
  const segment = {
    numberOfChannels: full.numberOfChannels,
    length: len,
    sampleRate: sr,
    getChannelData: ch => full.getChannelData(ch).subarray(s0, s1),
  }
  return encodeWav(segment)
}
