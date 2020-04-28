'use strict'

const Tidal = require('@vliegwerk/tidal')
const { Launchkey } = require('@vliegwerk/novation')

const tidal = new Tidal({ inPort: 9000 })

const controller = new Launchkey()

const LED_SUSTAIN = 50
let notesOn = []
let structOn = []

const STRUCT_NOTES = [112, 113, 114, 115, 116, 117, 118, 119]

tidal.on('ready', () => {
	console.log('Tidal UDP port ready')
})

tidal.on('message', (message) => {
	const { orbit, x = orbit, y = 0 } = message

	controller.ledOn(x, y, 1, 1 / 3)
	setTimeout(function () {
		controller.ledOff(x, y)
	}, LED_SUSTAIN)
})

tidal.on('error', (err) => {
	console.error('Error occured:', err)
})

controller.on('connected', () => {
	console.log(
		`Novation ${controller.name} ${controller.version} controller ready`
	)

	controller.reset()
	controller.extendedMode()

	controller.on('NoteOn', (message) => {
		const note = message.note
		switch (message.port) {
			case controller.ports.midi:
				notesOn.push(note)
				notesOn.sort()
				sendNotes(notesOn)
				break
			case controller.ports.daw:
				structOn.push(note)
				structOn.sort()
				sendStruct(structOn)
				break
		}
	})

	controller.on('NoteOff', (message) => {
		const note = message.note

		switch (message.port) {
			case controller.ports.midi:
				notesOn.splice(notesOn.indexOf(note), 1)
				sendNotes(notesOn)
				break
			case controller.ports.daw:
				structOn.splice(structOn.indexOf(note), 1)
				sendStruct(structOn)
				break
		}
	})

	controller.on('ControlChange', (message) => {
		const cc = message.control
		const f = message.value / 127
		console.log('CC:', cc, f)
		tidal.cF(cc, f)
	})
})

controller.on('error', (err) => {
	console.error('Error occured:', err)
})

controller.connect()

const sendNotes = (notesOn) => {
	const normalizedNotesOn = notesOn.map((note, idx, arr) => {
		return note - 60
	})

	console.log('Notes:', normalizedNotesOn)

	const chord = `[${normalizedNotesOn.join(',')}]`
	tidal.cP('chord', chord)

	const arp = `[${normalizedNotesOn.join(' ')}]`
	tidal.cP('arp', arp)

	const [bass = '', ...rest] = normalizedNotesOn
	tidal.cP('bass', bass)
}

const sendStruct = (structOn) => {
	const struct = STRUCT_NOTES.map((note) => {
		return structOn.indexOf(note) >= 0 ? 't' : 'f'
	})

	const pattern = struct.join(' ')
	console.log('Struct:', pattern)
	tidal.cP('struct', pattern)
}
