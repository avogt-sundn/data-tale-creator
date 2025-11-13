package drv.abac.v2

test_allow_read_sb if {
  allow with input as {
    "user_role": "SB",
    "user_attributes": "A",
    "task_id": "t1",
    "action": "read"
  } with data.tasks as {
    "t1": {"attributes": {"aufgabenart": "A"}},
    "t2": {"attributes": {"aufgabenart": "B"}}
  }
}

test_deny_write_sb if {
  not allow with input as {
    "user_role": "SB",
    "user_attributes": "B",
    "task_id": "t1",
    "action": "write"
  } with data.tasks as {
    "t1": {"attributes": {"aufgabenart": "A"}},
    "t2": {"attributes": {"aufgabenart": "B"}}
  }
}

# ✅ DIESER FEHLT!
test_allow_delete_hsb if {
  allow with input as {
    "user_role": "HSB",
    "user_attributes": "A",
    "task_id": "t1",
    "action": "delete"
  } with data.tasks as {
    "t1": {"attributes": {"aufgabenart": "A"}},
    "t2": {"attributes": {"aufgabenart": "B"}}
  }
}

test_deny_delete_sb if {
  not allow with input as {
    "user_role": "SB",
    "user_attributes": "A",
    "task_id": "t1",
    "action": "delete"
  } with data.tasks as {
    "t1": {"attributes": {"aufgabenart": "A"}},
    "t2": {"attributes": {"aufgabenart": "B"}}
  }
}