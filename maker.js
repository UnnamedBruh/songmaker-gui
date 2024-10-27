var SongMaker = (function() {
	async function wait(ms) {
		return new Promise(res => setTimeout(() => res(), ms))
	}
	class SongMaker {
		constructor(sampleRate = 48000, lazy = false, tempo = 120) {
			if (typeof sampleRate !== "number") {
				console.warn("The sample rate must be a number, not a '" + (typeof sampleRate) + "'")
				sampleRate = 48000
			} else {
				if (sampleRate === 0) {
					console.warn("The sample rate must not be 0, which this problem unsolved can cause infinitely long audio")
					sampleRate = 48000
				}
				if (sampleRate < 0) console.warn("The sample rate cannot be ≤ 0, though this case is handled")
			}
			if (sampleRate % 1 !== 0) {
				console.warn("The sample rate isn't rounded, but this case is handled")
			}
			if (typeof tempo !== "number") {
				console.warn("The tempo must be a number, not a '" + (typeof sampleRate) + "'")
				tempo = 120
			} else {
				if (tempo === 0) {
					console.warn("The tempo must not be 0, which this problem unsolved can cause infinitely long audio")
					tempo = 120;
				}
				if (sampleRate < 0) console.warn("The tempo cannot be ≤ 0, though this case is handled")
			}
			sampleRate = Math.abs(Math.round(sampleRate))
			const songData = []
			this.lazyCheck = lazy
			tempo = Math.abs(tempo)
			this.song = {
				note: (instrument = "sine", start = 0, end = 1, key = 60, volume = 1) => {
					// I hate programming these checks
					if (!this.lazy) {
						if (typeof instrument !== "string") {
							throw new Error("The 'instrument' parameter must be provided/a string")
						} else if (typeof start !== "number") {
							throw new Error("The 'start' parameter must be provided/a numerical value")
						} else if (start < 0) {
							throw new Error("The 'start' parameter must not be a negative value")
						} else if (start === Infinity) {
							throw new Error("The 'start' parameter must be a finite value")
						} else if (typeof end !== "number") {
							throw new Error("The 'end' parameter must be provided/a numerical value")
						} else if (end < 0) {
							throw new Error("The 'end' parameter must not be a negative value")
						} else if (end === Infinity) {
							throw new Error("The 'end' parameter must be a finite value")
						} else if (start > end) {
							throw new Error("The 'start' parameter must not be a higher value than the 'end' parameter")
						} else if (start === end) {
							console.warn("The 'start' parameter is equal to the 'end' parameter. The note will not be placed")
						} else if (typeof key !== "number") {
							throw new Error("The 'key' parameter must be provided/a number")
						} else if (key <= 0) {
							throw new Error("The 'key' parameter must NOT be below or equal to 0. Otherwise, distortions could occur, or the note can barely be heard")
						} else if (key > 127) {
							throw new Error("The 'key' parameter must NOT be above 127")
						} else if (typeof volume !== "number") {
							throw new Error("The 'volume' parameter must be provided/a number")
						} else if (volume < 0) {
							throw new Error("The 'volume' parameter must NOT be a negative value")
						}
					}
					const t = tempo / 120
					songData.push([instrument, Math.round(start * sampleRate * t), Math.round(end * sampleRate * t), key, volume])
				}
			}
			const writeString = (view, offset, string) => {
				for (let i = 0; i < string.length; i++) {
					view.setUint8(offset + i, string.charCodeAt(i))
				}
			}
			this.render = async (exp = "blob") => {
				let freezeCount = 0
				const len = Math.max(...songData.map(note => note[2]))
				const rendered = new Float32Array(len)
				async function sineWave(start, end, note, volume) {
					if (volume === 0) return;
					const len = rendered.length, cache = 2 * Math.PI, frequency = 440 * (note === 69 ? 1 : Math.pow(2, (note - 69) / 12))
					if (volume === 1) {
						for (let i = start; i !== end; i++) {
							rendered[i] += Math.sin((cache * frequency * i) / sampleRate)
							if (freezeCount === 5999999) {
								await wait(100)
								freezeCount = 0
							}
							freezeCount++
						}
					} else {
						for (let i = start; i !== end; i++) {
							rendered[i] += Math.sin((cache * frequency * i) / sampleRate) * volume
							if (freezeCount === 5999999) {
								await wait(100)
								freezeCount = 0
							}
							freezeCount++
						}
					}
				}
				async function bitcrush(start, end, note, volume) {
					const len = rendered.length, frequency = Math.pow(0.5, note / 10)
					if (volume === 1) {
						for (let i = start; i !== end; i++) {
							rendered[i] += Math.floor(Math.random() / frequency) * frequency;
						}
					}
				}
				for (const note of songData) {
					switch (note[0]) {
						case "sine":
							await sineWave(note[1], note[2], note[3], note[4])
							break
					}
				}
				if (exp === "floatarray") return rendered;
				const numChannels = 1, ch1 = 32767, ch2 = 32768, ch3 = 0, ch4 = -1, ch5 = 1
				const len2 = len * 2
				const buffer = new ArrayBuffer(44 + len2)
				const view = new DataView(buffer)
				writeString(view, 0, 'RIFF')
				view.setUint32(4, 36 + len2, true)
				writeString(view, 8, 'WAVE')
				writeString(view, 12, 'fmt ')
				view.setUint32(16, 16, true)
				view.setUint16(20, 1, true)
				view.setUint16(22, numChannels, true)
				view.setUint32(24, sampleRate, true)
				view.setUint32(28, sampleRate * 2, true)
				view.setUint16(32, 2, true)
				view.setUint16(34, 16, true)
				writeString(view, 36, 'data')
				view.setUint32(40, len2, true)
				let offset = 44, s
				for (let i = 0; i !== len; i++) {
					s = Math.max(ch4, Math.min(ch5, rendered[i]))
					view.setInt16(offset, s < ch3 ? s * ch1 : s * ch2, true)
					if (offset % 1000000 === 999999) {
						await wait(100)
					}
					offset += 2
				}
				return exp === "blob" ? new Blob([view], { type: 'audio/wav' }) : exp === "dataview" ? view : undefined
			}
			this.version = 0;
		}
	}
	return SongMaker
})()
