package app.abac

default allow := false

allow if {
	some task in data.tasks
	task.id == input.task.id
	input.user.attributes.aufgabenart == task.attributes.aufgabenart	
	input.action != "delete"
}

allow if {
	some task in data.tasks
	input.user.attributes.aufgabenart == task.attributes.aufgabenart	
	input.action == "delete"
	input.user.role == "admin"
}