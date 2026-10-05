// Copyright (c) Meta Platforms, Inc. and affiliates.
const media =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='900'%3E%3Crect width='1200' height='900' fill='%230064e0'/%3E%3Ccircle cx='600' cy='390' r='190' fill='%23ffffff' fill-opacity='.88'/%3E%3Ctext x='600' y='730' text-anchor='middle' font-family='sans-serif' font-size='72' fill='white'%3ELaunch%3C/text%3E%3C/svg%3E";
export default {
  name: 'Lightbox',
  variant: 'single-image',
  tag: 'ax-lightbox',
  attributes: {
    src: media,
    alt: 'Blue launch artwork with a white circle',
    caption: 'Launch day artwork',
    'trigger-label': 'Open launch photo',
    label: 'Launch photo viewer',
  },
  html: '',
  actualSelector: '.ax-lightbox__item',
  expectedSelector: '.ax-lightbox__item',
};
