import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

// Import to load these templates
import '../../client/layouts/app-body.js';
import '../../client/pages/root-redirector.js';
import '../../client/pages/community-main-page.js';
import '../../client/pages/topics-show-page.js';
import '../../client/pages/app-not-found.js';
import '../../client/forms/communities-create-form.js';
import '../../client/forms/communities-join-form.js';
import '../../client/forms/users-show-form.js';

// Import to override accounts templates
import '../../client/accounts/accounts-templates.js';

FlowRouter.route('/', {
  name: 'App.home',
  action() {
    BlazeLayout.render('App_body', { main: 'app_rootRedirector' });
  },
});

FlowRouter.route('/c/:_cid', {
  name: 'Community.main',
  action() {
    BlazeLayout.render('App_body', { main: 'Community_main_page' });
  },
});

FlowRouter.route('/c/:_cid/invite', {
  name: 'Community.invite',
  action() {
    BlazeLayout.render('App_body', { main: 'Community_invite_form' });
  },
});

FlowRouter.route('/c/:_cid/t/:_tid', {
  name: 'Topics.show',
  action() {
    BlazeLayout.render('App_body', { main: 'Topics_show_page' });
  },
});

FlowRouter.route('/join-community', {
  name: 'Communities.join',
  action() {
    BlazeLayout.render('App_body', { main: 'Communities_join_form' });
  },
});

FlowRouter.route('/create-community', {
  name: 'Communities.create',
  action() {
    BlazeLayout.render('App_body', { main: 'Communities_create_form' });
  },
});

FlowRouter.route('/user/:_id', {
  name: 'Users.show',
  action() {
    BlazeLayout.render('App_body', { main: 'Users_show_form' });
  },
});

// the App_notFound template is used for unknown routes and missing topics
FlowRouter.notFound = {
  action() {
    BlazeLayout.render('App_body', { main: 'App_notFound' });
  },
};
