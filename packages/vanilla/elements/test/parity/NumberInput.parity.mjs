// Copyright (c) Meta Platforms, Inc. and affiliates.
export default {
  name: 'NumberInput',
  variant: 'default',
  tag: 'ax-number-input',
  attributes: {
    label: 'Seats',
    description: 'Choose between 1 and 100 seats.',
    'html-name': 'seat-count',
    min: '1',
    max: '100',
    step: '1',
    value: '12',
    units: 'seats',
  },
  html: '',
};
