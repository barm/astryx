// Copyright (c) Meta Platforms, Inc. and affiliates.
export default {
  name: 'Typeahead',
  variant: 'default',
  tag: 'ax-typeahead',
  attributes: {
    label: 'Assignee',
    description: "Start typing a team member's name.",
    'html-name': 'assignee',
    placeholder: 'Search people',
    'list-id': 'assignee-options',
  },
  html: '<option value="Alex Morgan"></option><option value="Sam Rivera"></option><option value="Taylor Chen"></option>',
};
