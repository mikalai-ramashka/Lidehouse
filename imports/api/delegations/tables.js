import { TAPi18n } from 'meteor/tap:i18n';

const __ = TAPi18n.__;

function renderEditButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-edit nav-item icon-edit"></span>`;
  return html;
}

function renderDeleteButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-delete nav-item icon-trash"></span>`;
  return html;
}

function renderRefuseButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-refuse glyphicon glyphicon-remove"></span>`;
  return html;
}

export function delegationFromMeColumns() {
  return [
    { data: 'object()', title: __('delegations.objectId.label') },
    { data: 'votingShare()', title: __('votingShare') },
    { data: 'targetUser()', title: __('delegations.targetUserId.label') },
    { data: '_id', render: renderEditButton },
    { data: '_id', render: renderDeleteButton },
  ];
}

export function delegationToMeColumns() {
  return [
    { data: 'sourceUser()', title: __('delegations.sourceUserId.label') },
    { data: 'object()', title: __('delegations.objectId.label') },
    { data: 'votingShare()', title: __('votingShare') },
    { data: '_id', render: renderRefuseButton },
  ];
}