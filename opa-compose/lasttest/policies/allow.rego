package drv.abac

default allow := false

allow if {
  task := data.tasks[input.task_id]
  input.user_attributes == task.attributes.aufgabenart
  input.action in {"read", "write"}
}

allow if {
  task := data.tasks[input.task_id]
  input.user_attributes== task.attributes.aufgabenart
  input.action == "delete"
  input.user_role == "HSB"
}