package queries

users_by_attribute contains user if {
    team := data.teams[_]
    user := team.members[_]
    user.attributes.aufgabenart == input.aufgabenart
}

tasks_by_attribute contains user if {
    team := data.teams[_]
    user := team.members[_]
    user.attributes.aufgabenart == input.aufgabenart
}

user_by_id contains user if {
    team := data.teams[_]
    user := team.members[input.user_id]
}

team_of_user := team if {
    team := data.teams[_]
    team.members[input.user_id]
}

tasks_by_user contains task if {
    team := data.teams[_]
    user := team.members[input.user_id]

    task := data.tasks[_]
    task.attributes.aufgabenart == user.attributes.aufgabenart
}

overview := result if {
    teams := [t | t := data.teams[_]]
    tasks := [t | t := data.tasks[_]]
    users := [u | 
        team := data.teams[_]
        u := team.members[_]
    ]
    
    result := {
        "teams": count(teams),
        "tasks": count(tasks),
        "users": count(users)
    }
}

