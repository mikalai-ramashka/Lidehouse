
import { Tracker } from 'meteor/tracker';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { CommunityRelatedRoutes } from '/imports/startup/both/routes.js';

// Automatic redirection
// if no user is logged in, then let us not show the community related pages
// (should we do something when ... or no active community selected?)

Tracker.autorun(() => {
  const currentRoute = FlowRouter.getRouteName();
  if (CommunityRelatedRoutes.includes(currentRoute) || currentRoute === 'User data page') {
    AccountsTemplates.forceLogin();
  }
});
