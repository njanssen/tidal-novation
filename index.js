'use strict'

const Tidal = require('@vliegwerk/tidal')
const Novation = require('@vliegwerk/novation')

const tidal = new Tidal({ inPort: 9000 })

const controller = new Novation({
	controller : Novation.controllers.launchkey_mini_mk2
})

const LED_SUSTAIN = 50
let notesOn = []

tidal.on('ready', () => {
	console.log('Tidal UDP port ready')
})

tidal.on('message', (message) => {
	controller.ledOn(message.orbit, 0, 1, 1/3)
	setTimeout(function () {
		controller.ledOff(message.orbit, 0)
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
		switch (message.port) {
			case controller.ports.midi:
				const note = message.note
				notesOn.push(note)
				notesOn.sort()
				sendNotes(notesOn)
				break
		}
	})

	controller.on('NoteOff', (message) => {
		switch (message.port) {
			case controller.ports.midi:
				const note = message.note
				const idx = notesOn.indexOf(note)
				notesOn.splice(idx, 1)
				sendNotes(notesOn)
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
