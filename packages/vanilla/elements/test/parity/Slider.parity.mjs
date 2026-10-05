// Copyright (c) Meta Platforms, Inc. and affiliates.
export default {
  name: 'Slider',
  variant: 'default',
  tag: 'ax-slider',
  attributes: {
    label: 'Volume',
    description: 'Adjust playback volume.',
    'html-name': 'volume',
    min: '0',
    max: '100',
    value: '65',
    'value-suffix': '%',
  },
  html: '',
  actualSelector: '.ax-slider__label-row',
  expectedSelector: '.ax-slider__label-row',
};
