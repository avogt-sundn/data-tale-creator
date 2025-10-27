package queries

users_by_aufgabenart contains user if {
    team := data.teams[_]
    user := team.members[_]
    user.attributes.aufgabenart == input.aufgabenart
}

user_by_id contains user if {
    team := data.teams[_]
    user := team.members[input.user_id]
}

users_by_role contains user if {
    team := data.teams[_]
    user := team.members[_]
    user.role == input.role
}

team_of_user := team if {
    team := data.teams[_]
    team.members[input.user_id]
}
