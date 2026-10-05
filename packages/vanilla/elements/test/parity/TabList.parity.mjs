// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'TabList',
  variant: 'panels',
  tag: 'ax-tab-list',
  attributes: {label: 'Project views', value: 'overview'},
  html: '<ax-tab value="overview" panel-id="panel-overview">Overview</ax-tab><ax-tab value="activity" panel-id="panel-activity">Activity</ax-tab><ax-tab value="settings" panel-id="panel-settings">Settings</ax-tab><div class="ax-tab-panel" slot="panels" id="panel-overview" role="tabpanel">Overview content</div><div class="ax-tab-panel" slot="panels" id="panel-activity" role="tabpanel">Activity content</div><div class="ax-tab-panel" slot="panels" id="panel-settings" role="tabpanel">Settings content</div>',
};
