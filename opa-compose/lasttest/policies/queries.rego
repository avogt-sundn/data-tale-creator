package drv.queries

user_by_id contains user if {
    team := data.teams[_]
    user := team.members[input.user_id]
}

team_of_user := team if {
    team := data.teams[_]
    team.members[input.user_id]
}

hsb_of_user contains hsb if {
    team := data.teams[_]
    team.members[input.user_id]
    some member_id, member in team.members
    member.role == "HSB"
    hsb := member
}

tasks_by_user contains task if {
    team := data.teams[_]
    user := team.members[input.user_id]
    task := data.tasks[_]
    task.attributes.aufgabenart == user.attributes.aufgabenart
}

users_by_attribute contains user if {
    team := data.teams[_]
    user := team.members[_]
    user.attributes.aufgabenart == input.aufgabenart
}

tasks_by_attribute contains task if {
    task := data.tasks[_]
    task.attributes.aufgabenart == input.aufgabenart
}

attributes_of_team contains art if {
    some team in data.teams
    team.members[input.user_id]
    some member_id, member in team.members
    art := member.attributes.aufgabenart
}

distinct_attributes_in_tasks := result if {
    aufgabenarten := {art | 
        task := data.tasks[_]
        art := task.attributes.aufgabenart
    }
    result := aufgabenarten
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