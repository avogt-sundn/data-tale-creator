{
  teams: [
      '{{repeat(5)}}',
    {
      id: 'team-{{index()}}',
      name: 'Team {{company()}}',
      members: [
        '{{repeat(8, 12)}}',
        {
          id: 'u-{{index()}}',
          name: '{{firstName()}} {{surname()}}',
          email: '{{email()}}',
          attributes: {
            aufgabenart: '{{random("aufgabenart-1","aufgabenart-2","aufgabenart-3","aufgabenart-4","aufgabenart-5","aufgabenart-6","aufgabenart-7","aufgabenart-8","aufgabenart-9","aufgabenart-10")}}'
          },
          role: '{{ index() === 0 ? "admin" : "SB" }}'
        }
      ]
    }
  ],
  tasks: [
      '{{repeat(5)}}',
    {
      id: 't-{{index()}}',
      title: 'Task {{lorem(3, "words")}}',
      attributes: {
        aufgabenart: '{{random("aufgabenart-1","aufgabenart-2","aufgabenart-3","aufgabenart-4","aufgabenart-5","aufgabenart-6","aufgabenart-7","aufgabenart-8","aufgabenart-9","aufgabenart-10")}}'
      }
    }
  ]
}
