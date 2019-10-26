import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { getPartnersActionsSmall } from './actions.js';

export function partnersColumns() {
  const columns = [
    { data: 'toString()', title: __('schemaBills.partnerId.label') },
    { data: 'outstanding', title: __('schemaBills.outstanding.label') },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group_small, { _id: cellData, actions: getPartnersActionsSmall() }) },
  ];

  return columns;
}
