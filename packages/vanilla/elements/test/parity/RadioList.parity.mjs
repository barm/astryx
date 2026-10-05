// Copyright (c) Meta Platforms, Inc. and affiliates.
export default {
  name: 'RadioList',
  variant: 'default',
  tag: 'ax-radio-list',
  attributes: {
    label: 'Notification channel',
    description: 'Choose where delivery updates should be sent.',
    'html-name': 'notification-channel',
    value: 'email',
  },
  html: '<label class="ax-radio-list__item"><input class="ax-radio-list__input" type="radio" value="email"><span class="ax-radio-list__indicator" aria-hidden="true"></span><span class="ax-radio-list__content"><span class="ax-radio-list__label">Email</span><span class="ax-radio-list__item-description">Best for detailed updates.</span></span></label><label class="ax-radio-list__item"><input class="ax-radio-list__input" type="radio" value="chat"><span class="ax-radio-list__indicator" aria-hidden="true"></span><span class="ax-radio-list__content"><span class="ax-radio-list__label">Chat</span></span></label>',
  actualSelector: '.ax-radio-list__description',
  expectedSelector: '.ax-radio-list__description',
};
