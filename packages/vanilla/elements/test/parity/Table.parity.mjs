// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Table',
  variant: 'balanced-rows',
  tag: 'ax-table',
  attributes: {label: 'Project table', 'has-hover': true},
  html: `<table class="ax-table ax-table--hover">
    <caption>Project delivery status</caption>
    <thead><tr><th scope="col">Project</th><th scope="col">Owner</th><th scope="col">Status</th><th scope="col" class="ax-table__numeric">Tasks</th></tr></thead>
    <tbody>
      <tr><td>Vanilla Astryx</td><td>Design Systems</td><td><span class="ax-badge ax-badge--success">On track</span></td><td class="ax-table__numeric">24</td></tr>
      <tr><td>Theme migration</td><td>Foundations</td><td><span class="ax-badge ax-badge--warning">At risk</span></td><td class="ax-table__numeric">11</td></tr>
      <tr><td>CLI templates</td><td>Developer Experience</td><td><span class="ax-badge ax-badge--info">Planning</span></td><td class="ax-table__numeric">8</td></tr>
    </tbody>
  </table>`,
};
