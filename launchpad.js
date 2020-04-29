'use strict'

const Tidal = require('@vliegwerk/tidal')
const { Launchpad } = require('@vliegwerk/novation')

const tidal = new Tidal({ inPort: 9000 })

const controller = new Launchpad()

const LED_SUSTAIN = 50
let notesOn = []

tidal.on('ready', () => {
	console.log('Tidal UDP port ready')
})

tidal.on('message', (message) => {
	const { orbit, clr = Launchpad.COLOR.YELLOW } = message

	controller.ledOn(orbit, 1, clr)
	setTimeout(function () {
		controller.ledOff(orbit, 1)
	}, LED_SUSTAIN)
})

tidal.on('error', (err) => {
	console.error('Error occured:', err)
})

controller.on('connected', () => {
	console.log(`Novation ${controller.name} controller ready`)

	controller.dawMode()
	controller.dawClear()
	controller.layoutSession()

	controller.ledSession(Launchpad.COLOR.YELLOW)
	controller.ledCtrlOn(Launchpad.CONTROLS.LOGO, Launchpad.COLOR.YELLOW)

	// Orbit scrolling
	controller.ledCtrlOn(Launchpad.CONTROLS.RIGHT, Launchpad.COLOR.WHITE_LOW)

	controller.on('NoteOn', (message) => {
		const note = message.note

		if (message.velocity == 127) {
			notesOn.push(note)
			notesOn.sort()
			sendNotes(notesOn)
		} else {
			notesOn.splice(notesOn.indexOf(note), 1)
			sendNotes(notesOn)
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
