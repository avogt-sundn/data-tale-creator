package drv.abac.v2

default allow := false

allow if {
  task := data.tasks[input.task_id]
  input.user_attributes == task.attributes.aufgabenart
  input.action == "read"
}

allow if {
  task := data.tasks[input.task_id]
  input.user_attributes== task.attributes.aufgabenart
  input.action in {"delete", "write"}
  input.user_role == "HSB"
}